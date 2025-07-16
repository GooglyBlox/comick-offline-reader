import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const response = await fetch(
      `https://api.comick.fun/comic/${slug}/?tachiyomi=true`,
      {
        headers: {
          "User-Agent": "ComickOfflineReader/1.0",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch comic data" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching comic data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
