import AVFoundation
import UIKit
import Combine

/// Service for managing camera capture with AVFoundation
/// Implements zero-loading camera startup by keeping session warm
class CameraService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var capturedImage: UIImage?
    @Published var isSessionRunning = false
    @Published var isCameraAuthorized = false
    @Published var error: CameraError?

    // MARK: - Camera Properties

    let session = AVCaptureSession()
    private var photoOutput: AVCapturePhotoOutput?
    private var videoDeviceInput: AVCaptureDeviceInput?
    private var captureCompletion: ((Result<UIImage, Error>) -> Void)?

    // MARK: - Queue

    private let sessionQueue = DispatchQueue(label: "com.crema.camera.sessionQueue")

    // MARK: - Initialization

    override init() {
        super.init()
    }

    // MARK: - Setup

    /// Request camera permissions
    func requestPermissions() async -> Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)

        switch status {
        case .authorized:
            await MainActor.run {
                self.isCameraAuthorized = true
            }
            return true

        case .notDetermined:
            // Request permission
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            await MainActor.run {
                self.isCameraAuthorized = granted
            }
            return granted

        case .denied, .restricted:
            await MainActor.run {
                self.isCameraAuthorized = false
                self.error = .permissionDenied
            }
            return false

        @unknown default:
            await MainActor.run {
                self.isCameraAuthorized = false
            }
            return false
        }
    }

    /// Configure camera session for highest quality photo capture
    func setupCamera() async throws {
        // Check permissions first
        guard await requestPermissions() else {
            throw CameraError.permissionDenied
        }

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            sessionQueue.async { [weak self] in
                guard let self = self else {
                    continuation.resume(throwing: CameraError.sessionSetupFailed)
                    return
                }

                do {
                    // Configure session for photo capture
                    self.session.beginConfiguration()
                    self.session.sessionPreset = .photo // Highest quality

                    // Add video input (back camera)
                    guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
                        throw CameraError.noCameraAvailable
                    }

                    let videoDeviceInput = try AVCaptureDeviceInput(device: videoDevice)

                    if self.session.canAddInput(videoDeviceInput) {
                        self.session.addInput(videoDeviceInput)
                        self.videoDeviceInput = videoDeviceInput
                    } else {
                        throw CameraError.sessionSetupFailed
                    }

                    // Add photo output
                    let photoOutput = AVCapturePhotoOutput()
                    photoOutput.isHighResolutionCaptureEnabled = true
                    photoOutput.maxPhotoQualityPrioritization = .quality

                    if self.session.canAddOutput(photoOutput) {
                        self.session.addOutput(photoOutput)
                        self.photoOutput = photoOutput
                    } else {
                        throw CameraError.sessionSetupFailed
                    }

                    self.session.commitConfiguration()

                    continuation.resume()
                } catch {
                    self.session.commitConfiguration()
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    /// Start camera session (call after setup)
    func startSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            if !self.session.isRunning {
                self.session.startRunning()

                DispatchQueue.main.async {
                    self.isSessionRunning = self.session.isRunning
                }
            }
        }
    }

    /// Stop camera session
    func stopSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            if self.session.isRunning {
                self.session.stopRunning()

                DispatchQueue.main.async {
                    self.isSessionRunning = false
                }
            }
        }
    }

    // MARK: - Photo Capture

    /// Capture a photo asynchronously
    func capturePhoto() async throws -> UIImage {
        guard let photoOutput = photoOutput else {
            throw CameraError.captureOutputNotConfigured
        }

        return try await withCheckedThrowingContinuation { continuation in
            self.captureCompletion = { result in
                continuation.resume(with: result)
            }

            sessionQueue.async {
                // Configure photo settings
                let photoSettings = AVCapturePhotoSettings()
                photoSettings.isHighResolutionPhotoEnabled = true

                // Set flash mode (auto)
                if photoOutput.supportedFlashModes.contains(.auto) {
                    photoSettings.flashMode = .auto
                }

                // Capture photo
                photoOutput.capturePhoto(with: photoSettings, delegate: self)
            }
        }
    }

    // MARK: - Focus and Exposure

    /// Set focus and exposure point (for tap-to-focus)
    func setFocusPoint(_ point: CGPoint) {
        guard let device = videoDeviceInput?.device else { return }

        sessionQueue.async {
            do {
                try device.lockForConfiguration()

                if device.isFocusPointOfInterestSupported && device.isFocusModeSupported(.autoFocus) {
                    device.focusPointOfInterest = point
                    device.focusMode = .autoFocus
                }

                if device.isExposurePointOfInterestSupported && device.isExposureModeSupported(.autoExpose) {
                    device.exposurePointOfInterest = point
                    device.exposureMode = .autoExpose
                }

                device.unlockForConfiguration()
            } catch {
                print("Failed to set focus point: \(error)")
            }
        }
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension CameraService: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            captureCompletion?(.failure(error))
            captureCompletion = nil
            return
        }

        guard let imageData = photo.fileDataRepresentation(),
              let image = UIImage(data: imageData) else {
            captureCompletion?(.failure(CameraError.imageProcessingFailed))
            captureCompletion = nil
            return
        }

        // Update captured image on main thread
        DispatchQueue.main.async { [weak self] in
            self?.capturedImage = image
        }

        // Return image via completion
        captureCompletion?(.success(image))
        captureCompletion = nil
    }
}

// MARK: - Camera Errors

enum CameraError: LocalizedError {
    case permissionDenied
    case noCameraAvailable
    case sessionSetupFailed
    case captureOutputNotConfigured
    case imageProcessingFailed

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Camera permission denied. Please enable camera access in Settings."
        case .noCameraAvailable:
            return "No camera available on this device."
        case .sessionSetupFailed:
            return "Failed to configure camera session."
        case .captureOutputNotConfigured:
            return "Photo capture not configured."
        case .imageProcessingFailed:
            return "Failed to process captured image."
        }
    }
}
