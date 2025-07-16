import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { hid: string } },
) {
  try {
    const { hid } = params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "1000";

    const response = await fetch(
      `https://api.comick.fun/comic/${hid}/chapters?limit=${limit}`,
      {
        headers: {
          "User-Agent": "ComickOfflineReader/1.0",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch chapters" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
