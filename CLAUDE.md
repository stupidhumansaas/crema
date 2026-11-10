PRODUCT REQUIREMENT DOCUMENT: CREMA
Version: 1.0 (The Aesthetic Edition) | Status: Draft / Ready for Dev | Date: January 05, 2026
1. Executive Summary
CREMA is a high-speed, minimalist social utility that unbundles the "Aesthetic Coffee Ritual" from bloated ordering apps. It prioritizes "Vibe Scoring," daily streaks, and instant visual gratification over payments and logistics.
The Problem: Coffee apps (Starbucks, Blue Bottle) are slow, transactional, and data-hungry. They focus on the transaction, ignoring the ritual.
The Solution: A "Snap-to-Log" interface that treats coffee like a daily status symbol. It generates high-fidelity "Digital Polaroids" that turn a morning caffeine fix into a shareable social artifact.
The Aesthetic: High-fashion minimalist. Cream (#FFFDD0) and Espresso (#3D2B1F). Serif typography (Playfair Display).
2. Market Validation (The "Why")
Component
Detail
The Incumbent
Starbucks, Blue Bottle, Specialty Coffee Apps
The Scale
50M+ Daily Coffee App Users
The Pain Point
Bloat & Isolation. Users take photos of their coffee for IG Stories manually; current apps offer zero social or aesthetic value—only coupons.
The Opportunity
Unbundle the "Vibe." Create a dedicated home for the 1.5 billion coffee photos taken annually.

3. The Core Mechanic: "The Vibe Score"
The app UI revolves around a single camera trigger.
Visual Metaphor: A high-end film camera viewfinder.
Action: Take a photo \rightarrow AI analyzes "The Vibe" \rightarrow Instant Score.
Scoring Factors:
Latte Art: Symmetrical patterns = Higher Score.
Lighting: Natural "Golden Hour" light = Multiplier.
Vessel: Ceramic/Glass > Plastic/Paper.
Consistency: Daily streaks increase the "Crema Rank."
4. User Experience (UX) Flow
Phase A: The 1-Second Launch
Zero Loading: App opens directly to a blurred camera preview.
One Button: A giant, haptic-heavy shutter button.
Phase B: The AI Evaluation
Analysis: The image is sent to a lightweight vision model.
Feedback: A rolling "slot machine" counter settles on a score (e.g., 8.4/10).
The "Roast": A one-line brutalist critique (e.g., "Basic bean, but the foam is elite.").
Phase C: The "Daily Pour" Polaroid (The Artifact)
The app automatically wraps the photo in a digital Polaroid frame.
Top: User's Current Streak (e.g., "14 Days Brewed").
Middle: The high-res coffee photo.
Bottom: The "Crema Tag" (Location, Time, and Vibe Score).
Phase D: The Social Feed (The "Cupping Room")
A vertical, fast-scrolling feed of only coffee Polaroids from followed users.
Interaction: Double-tap to "Steam" (Like).
5. Technical Architecture (Zero-Ops)
Frontend: ios native.
Intelligence: OpenAI GPT-4o-mini (Vision API) for scoring and "Roast" generation.
Database: Supabase (PostgreSQL) for user relationships and metadata.
Storage: Cloudinary (For on-the-fly Polaroid generation and image hosting).
Haptics: expo-haptics for "Mechanical Camera" feel.
6. The "Brain" (System Prompt)
JSON
{
  "role": "system",
  "content": "You are an elite, slightly snobby coffee sommelier. Analyze the image.
  1. Rate the 'Vibe' from 1.0 to 10.0 based on lighting, latte art, and aesthetic.
  2. Identify the vessel (Ceramic, Paper, Glass).
  3. Write a 5-word 'Roast' that is either a compliment or a witty critique.
  4. OUTPUT FORMAT: { 'score': float, 'vessel': string, 'roast': string }"
}

7. Financial Model
Running Costs: ~$0.01 per snap (Image API + Storage).
Pricing:
Free: 1 Snap/Day, Standard Frames.
Crema Gold ($2.99/mo): Unlimited Snaps, "Film Grain" filters, Custom Watermarks, and "Pro" Analytics (Caffeine tracking over time).
8. The Viral Engine
The Loop: Users post their "Daily Pour" to Instagram Stories to show off their morning aesthetic.
The Artifact: The Polaroid is perfectly aspect-ratioed for 9:16 (Stories).
The Watermark: "Captured on Crema." in a tiny, elegant serif font at the bottom right.
9. Development Roadmap
Week 1: Camera UI + Haptic Shutter Logic.
Week 2: GPT-4o-mini Vision Integration (Scoring Engine).
Week 3: Cloudinary dynamic image overlay (The Polaroid Generator).
Week 4: Simple Social Feed + Supabase Auth.
Week 5: Best beans, I want users to be able to rate beans
Week 6: Export-to-Instagram API integration.

Would you like me to generate the "Vibe Scoring" logic or the specific Cloudinary transformation parameters for the Polaroid artifact?



