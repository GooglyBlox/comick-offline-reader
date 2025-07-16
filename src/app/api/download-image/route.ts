import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const b2key = searchParams.get("b2key");

    if (!b2key) {
      return NextResponse.json(
        { error: "Missing b2key parameter" },
        { status: 400 },
      );
    }

    const response = await fetch(`https://meo.comick.pictures/${b2key}`, {
      headers: {
        "User-Agent": "ComickOfflineReader/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to download image" },
        { status: response.status },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/webp";

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error downloading image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
