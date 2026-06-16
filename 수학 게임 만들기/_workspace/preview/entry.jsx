import React from "react";
import { createRoot } from "react-dom/client";
import MathRacing from "../../자동차 게임/math-racing-game.tsx";

// 아티팩트 window.storage 대용(localStorage 백엔드)
if (!window.storage) {
  window.storage = {
    get: async (k) => ({ value: localStorage.getItem(k) }),
    set: async (k, v) => { localStorage.setItem(k, v); },
  };
}
createRoot(document.getElementById("root")).render(<MathRacing />);
