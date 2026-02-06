import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const fontData = await fetch(
    new URL(
      "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
      import.meta.url,
    ),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
        }}
      >
        <span
          style={{
            fontSize: 96,
            fontWeight: 300,
            letterSpacing: "0.15em",
            color: "white",
            fontFamily: "Geist",
          }}
        >
          GLIMPSE
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          data: fontData,
          weight: 300,
          style: "normal",
        },
      ],
    },
  );
}
