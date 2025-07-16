/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

function getTranslatorName(chapter: any): string {
  if (
    chapter.md_chapters_groups &&
    chapter.md_chapters_groups.length > 0 &&
    chapter.md_chapters_groups[0].md_groups?.title
  ) {
    return chapter.md_chapters_groups[0].md_groups.title;
  }

  if (chapter.group_name && chapter.group_name.length > 0) {
    return chapter.group_name[0];
  }

  if (chapter.identities?.traits?.username) {
    return chapter.identities.traits.username;
  }

  return "Unknown";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;

    const comicResponse = await fetch(
      `https://api.comick.fun/comic/${slug}/?tachiyomi=true`,
      {
        headers: {
          "User-Agent": "ComickOfflineReader/1.0",
        },
      },
    );

    if (!comicResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch comic data" },
        { status: comicResponse.status },
      );
    }

    const comicInfo = await comicResponse.json();

    const chaptersResponse = await fetch(
      `https://api.comick.fun/comic/${comicInfo.comic.hid}/chapters?limit=1000`,
      {
        headers: {
          "User-Agent": "ComickOfflineReader/1.0",
        },
      },
    );

    if (!chaptersResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch chapters" },
        { status: chaptersResponse.status },
      );
    }

    const chaptersData = await chaptersResponse.json();
    const chapters = chaptersData.chapters || [];

    const englishChapters = chapters.filter(
      (chapter: any) => chapter.lang === "en",
    );

    const translatorMap = new Map<string, number[]>();

    englishChapters.forEach((chapter: any) => {
      const translator = getTranslatorName(chapter);
      const chapterNum = parseFloat(chapter.chap);

      if (!translatorMap.has(translator)) {
        translatorMap.set(translator, []);
      }
      translatorMap.get(translator)!.push(chapterNum);
    });

    const translators: any[] = [];
    translatorMap.forEach((chapters, name) => {
      chapters.sort((a, b) => a - b);
      translators.push({
        name,
        chapters,
        latestChapter: Math.max(...chapters),
      });
    });

    const sortedTranslators = translators.sort(
      (a, b) => b.latestChapter - a.latestChapter,
    );

    return NextResponse.json(sortedTranslators);
  } catch (error) {
    console.error("Error fetching translator data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
