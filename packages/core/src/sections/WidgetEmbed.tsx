"use client";

import { useEffect, useRef } from "react";

// Insere o HTML colado e reexecuta os <script>: scripts vindos de innerHTML
// ficam inertes, então cada um é recriado para o navegador executá-lo.
export function WidgetEmbed({ html, minHeight }: { html: string; minHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = html;
    for (const old of container.querySelectorAll("script")) {
      const script = document.createElement("script");
      for (const attr of old.attributes) script.setAttribute(attr.name, attr.value);
      script.text = old.text;
      old.replaceWith(script);
    }
    return () => {
      container.innerHTML = "";
    };
  }, [html]);

  return <div ref={ref} style={{ minHeight }} />;
}
