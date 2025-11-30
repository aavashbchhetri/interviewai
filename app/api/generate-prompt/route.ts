import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcription, topic } = await request.json();

    if (!transcription || !topic) {
      return NextResponse.json(
        { error: "Missing transcription or topic" },
        { status: 400 }
      );
    }

    const prompt = `Based on the user's speech transcription: "${transcription}", and the topic: "${topic}", generate a helpful, relevant prompt for the user to continue their response or improve their communication. Keep it concise and actionable.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an AI coach helping users improve their communication skills through video recording sessions.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 100,
    });

    const aiPrompt =
      completion.choices[0]?.message?.content?.trim() ||
      "Continue speaking naturally.";

    return NextResponse.json({ prompt: aiPrompt });
  } catch (error) {
    console.error("Error generating prompt:", error);
    return NextResponse.json(
      { error: "Failed to generate prompt" },
      { status: 500 }
    );
  }
}
