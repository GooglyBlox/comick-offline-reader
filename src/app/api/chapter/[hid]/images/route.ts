import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { hid: string } },
) {
  try {
    const { hid } = params;
    const response = await fetch(
      `https://api.comick.fun/chapter/${hid}/get_images`,
      {
        headers: {
          "User-Agent": "ComickOfflineReader/1.0",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch chapter images" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching chapter images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
