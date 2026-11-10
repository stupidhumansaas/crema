import Foundation
import UIKit

/// Service for sending coffee photos to GPT-4o-mini Vision API for vibe scoring
class OpenAIService {
    // MARK: - Singleton

    static let shared = OpenAIService()

    private init() {}

    // MARK: - API

    /// Analyze a coffee photo and return a VibeScore
    func analyzePhoto(_ image: UIImage) async throws -> VibeScore {
        let apiKey = AppEnvironment.openAIAPIKey
        guard !apiKey.isEmpty else {
            throw OpenAIError.missingAPIKey
        }

        // Compress and encode image
        guard let imageData = image.jpegData(compressionQuality: CGFloat(Constants.Camera.compressionQuality)),
              imageData.count <= Constants.Camera.targetFileSize * 5 else {
            throw OpenAIError.imageTooLarge
        }

        let base64Image = imageData.base64EncodedString()

        // Build request
        let url = URL(string: "\(Constants.API.openAIBaseURL)/chat/completions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body: [String: Any] = [
            "model": Constants.API.openAIModel,
            "messages": [
                [
                    "role": "system",
                    "content": Constants.Scoring.systemPrompt
                ],
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "text",
                            "text": "Analyze this coffee photo and rate its vibe."
                        ],
                        [
                            "type": "image_url",
                            "image_url": [
                                "url": "data:image/jpeg;base64,\(base64Image)",
                                "detail": "low"
                            ]
                        ]
                    ]
                ]
            ],
            "max_tokens": 200,
            "temperature": 0.7
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        // Send request
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw OpenAIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if httpResponse.statusCode == 401 {
                throw OpenAIError.invalidAPIKey
            }
            if httpResponse.statusCode == 429 {
                throw OpenAIError.rateLimited
            }
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown"
            throw OpenAIError.apiError(statusCode: httpResponse.statusCode, message: errorBody)
        }

        // Parse response
        return try parseResponse(data)
    }

    // MARK: - Parsing

    private func parseResponse(_ data: Data) throws -> VibeScore {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw OpenAIError.parseError
        }

        // The AI returns JSON in the content string — parse it
        let cleanedContent = content
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard let contentData = cleanedContent.data(using: .utf8) else {
            throw OpenAIError.parseError
        }

        let decoder = JSONDecoder()
        return try decoder.decode(VibeScore.self, from: contentData)
    }
}

// MARK: - Errors

enum OpenAIError: LocalizedError {
    case missingAPIKey
    case invalidAPIKey
    case imageTooLarge
    case invalidResponse
    case rateLimited
    case parseError
    case apiError(statusCode: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "OpenAI API key not configured. Add OPENAI_API_KEY to your environment."
        case .invalidAPIKey:
            return "Invalid OpenAI API key."
        case .imageTooLarge:
            return "Image is too large to analyze."
        case .invalidResponse:
            return "Invalid response from scoring service."
        case .rateLimited:
            return "Too many requests. Try again in a moment."
        case .parseError:
            return "Could not parse the vibe score. Try another photo."
        case .apiError(let code, let message):
            return "API error (\(code)): \(message)"
        }
    }
}
