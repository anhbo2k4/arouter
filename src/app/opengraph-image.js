import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          background: "#050709",
          color: "#F0F2F5",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: "#14D296",
              }}
            />
            <div style={{ fontSize: "22px", letterSpacing: "0.18em" }}>AROUTER</div>
          </div>
          <div
            style={{
              padding: "6px 12px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              fontSize: "14px",
              color: "#8B95A3",
            }}
          >
            Public token checker
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "760px" }}>
          <div style={{ fontSize: "68px", fontWeight: 600, lineHeight: 1.02 }}>Check usage first.</div>
          <div style={{ fontSize: "68px", fontWeight: 600, lineHeight: 1.02, color: "#8B95A3" }}>Then buy the right weekly plan.</div>
          <div style={{ fontSize: "26px", lineHeight: 1.5, color: "#8B95A3", maxWidth: "700px" }}>
            AI token distribution for developers and teams. Weekly plans powered by ARouter.
          </div>
        </div>

        <div style={{ display: "flex", gap: "20px" }}>
          {[
            { name: "Starter", price: "200,000 VND", tokens: "100M tokens" },
            { name: "Popular", price: "400,000 VND", tokens: "200M tokens" },
            { name: "Power", price: "1,000,000 VND", tokens: "500M tokens" },
          ].map((plan, index) => (
            <div
              key={plan.name}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: "12px",
                borderRadius: "20px",
                border: index === 1 ? "1px solid rgba(20,210,150,0.35)" : "1px solid rgba(255,255,255,0.08)",
                background: index === 1 ? "rgba(20,210,150,0.05)" : "#0C0F14",
                padding: "24px",
              }}
            >
              <div style={{ fontSize: "16px", letterSpacing: "0.12em", color: index === 1 ? "#14D296" : "#8B95A3" }}>
                {plan.name.toUpperCase()}
              </div>
              <div style={{ fontSize: "34px", fontWeight: 600 }}>{plan.price}</div>
              <div style={{ fontSize: "20px", color: "#14D296" }}>{plan.tokens}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
