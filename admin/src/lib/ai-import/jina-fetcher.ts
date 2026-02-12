// Fetch web content using Jina Reader
// Jina Reader renders JavaScript and returns clean markdown

const JINA_BASE_URL = "https://r.jina.ai";
const FETCH_TIMEOUT = 30000; // 30 seconds

export async function fetchWebContent(url: string): Promise<string> {
  const jinaUrl = `${JINA_BASE_URL}/${url}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(jinaUrl, {
      method: "GET",
      headers: {
        Accept: "text/markdown",
        "User-Agent": "Mozilla/5.0 (compatible; IndiaesqueBot/1.0)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Jina Reader returned status ${response.status}`);
    }

    const content = await response.text();

    if (!content || content.trim().length < 100) {
      throw new Error(
        "Page returned minimal content. It may require authentication or have anti-bot protection."
      );
    }

    return content;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out after 30 seconds");
      }
      throw error;
    }

    throw new Error("Failed to fetch web content");
  }
}
