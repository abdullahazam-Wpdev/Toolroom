const guides: Record<string, { steps: string[]; note: string }> = {
  "pdf-merge": {
    steps: [
      "Choose up to ten unlocked PDFs.",
      "Move files up or down to set the document order.",
      "Process the files, then download the combined PDF.",
    ],
    note: "Pages follow the file-list order. Use the original documents when signatures, interactive forms or accessibility tags must be retained.",
  },
  "pdf-extract": {
    steps: [
      "Choose one unlocked PDF.",
      "Enter page numbers or ascending ranges, such as 1,3-5.",
      "Download a new PDF containing those pages in the entered order.",
    ],
    note: "Page numbers start at one. Blank selection includes every page. The source file is not overwritten.",
  },
  "pdf-split": {
    steps: [
      "Choose one unlocked PDF.",
      "Select page numbers or leave the field blank for all pages.",
      "Download each page separately or collect the generated PDFs in a ZIP.",
    ],
    note: "Each selected page becomes a separate one-page PDF. This tool does not split documents by text headings or file size.",
  },
  "pdf-rotate": {
    steps: [
      "Choose one unlocked PDF and select the pages to rotate.",
      "Choose 90, 180 or 270 degrees clockwise.",
      "Download the new PDF and check its page orientation.",
    ],
    note: "Unselected pages keep their original rotation. Page boxes and original content are preserved; the orientation changes through page rotation.",
  },
  "pdf-metadata": {
    steps: [
      "Choose a PDF to inspect in this browser tab.",
      "Read its title, author, creator, producer and page information.",
      "Download a JSON inventory if you need to retain the findings.",
    ],
    note: "Document metadata can be missing, outdated or user-edited. It is not reliable proof of authorship, creation history or authenticity.",
  },
  "json-formatter": {
    steps: [
      "Paste valid JSON text.",
      "Choose readable formatting or compact minification.",
      "Run the tool, review any syntax error, then copy or download the result.",
    ],
    note: "JSON requires double-quoted property names and does not allow comments or trailing commas. JavaScript number precision and duplicate-key behavior apply.",
  },
  "base64-converter": {
    steps: [
      "Choose UTF-8 encoding or Base64 decoding.",
      "Paste the source text and run the tool.",
      "Copy or download the resulting text.",
    ],
    note: "Base64 is an encoding, not encryption. Decoding requires valid UTF-8 text; arbitrary binary files are outside this tool’s scope.",
  },
  "url-encoder": {
    steps: [
      "Choose component encoding or decoding.",
      "Paste a parameter value, path component or percent-encoded string.",
      "Run the tool and copy the converted value.",
    ],
    note: "This tool encodes individual URI components. Do not encode a complete URL unless you intend to use that URL as a value inside another URL. Plus signs are not converted into spaces.",
  },
  "uuid-generator": {
    steps: [
      "Enter the number of identifiers you need, from one to one hundred.",
      "Generate version 4 UUIDs with the browser’s cryptographic random source.",
      "Copy or download one identifier per line.",
    ],
    note: "Random UUIDs are suitable as identifiers; they do not grant authorization or replace an application’s access-control checks.",
  },
  "hash-generator": {
    steps: [
      "Choose SHA-256, SHA-384 or SHA-512.",
      "Enter the exact UTF-8 text, including any intended spaces or line breaks.",
      "Run the tool and copy its hexadecimal digest.",
    ],
    note: "Changing one byte changes the digest. This hashes text rather than uploaded files, and unkeyed SHA digests are not password-storage functions.",
  },
  "color-converter": {
    steps: [
      "Enter a three- or six-digit HEX value, or integer rgb() channels.",
      "Run the conversion.",
      "Copy equivalent HEX, RGB and HSL values for your design.",
    ],
    note: "Opaque sRGB colors only. Alpha channels, wide-gamut CSS colors and named colors are not supported in this version.",
  },
};
export function LocalToolGuide({ id, name }: { id: string; name: string }) {
  const guide = guides[id];
  if (!guide) return null;
  return (
    <div className="tool-explainer">
      <div>
        <h2>How to use {name.toLowerCase()}</h2>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <aside>
        <h3>Choose the right workflow</h3>
        <p>{guide.note}</p>
        <h3>Local processing</h3>
        <p>
          Your tool input stays in this tab. Processing does not need a login,
          API key or background server. Browser memory and the displayed input
          limits still apply.
        </p>
      </aside>
    </div>
  );
}
