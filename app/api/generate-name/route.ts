import { NextResponse } from "next/server";
import { generateProjectName } from "@/lib/gemini";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    const projectName = await generateProjectName(imageData);

    return NextResponse.json({ name: projectName });
  } catch (error) {
    console.error("Error generating project name:", error);
    return NextResponse.json(
      { error: "Failed to generate project name" },
      { status: 500 }
    );
  }
}

