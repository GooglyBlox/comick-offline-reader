import { NextRequest, NextResponse } from "next/server";
import { Chapter } from "@/types/comick";

export async function GET(
  request: NextRequest,
  { params }: { params: { hid: string } }
) {
  try {
    const { hid } = params;
    const { searchParams } = new URL(request.url);
    const requestedLimit = searchParams.get("limit") || "1000";

    let allChapters: Chapter[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const queryParams = new URLSearchParams({
        limit: requestedLimit,
        page: currentPage.toString(),
      });

      const response = await fetch(
        `https://api.comick.fun/comic/${hid}/chapters?${queryParams.toString()}`,
        {
          headers: {
            "User-Agent": "ComickOfflineReader/1.0",
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to fetch chapters" },
          { status: response.status }
        );
      }

      const data = await response.json();
      const chapters: Chapter[] = data.chapters || [];

      if (chapters.length === 0) {
        hasMorePages = false;
      } else {
        allChapters = allChapters.concat(chapters);

        if (chapters.length < parseInt(requestedLimit)) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
      }

      if (currentPage > 100) {
        console.warn(`Stopped fetching chapters for ${hid} after 100 pages`);
        hasMorePages = false;
      }
    }

    return NextResponse.json({
      chapters: allChapters,
      total: allChapters.length,
    });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
