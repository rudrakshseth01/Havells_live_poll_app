// Real QR via the qrcode lib — encodes the join URL so a phone camera scan
// drops the player straight into /?join=CODE.
import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#0B1220", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });
  }, [value, size]);
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 8, display: "inline-block" }}>
      <canvas ref={ref} width={size} height={size} style={{ display: "block", borderRadius: 8 }} />
    </div>
  );
}
