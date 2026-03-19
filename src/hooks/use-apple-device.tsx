import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isAppleDevice } from "@/lib/pwa-utils";

const AppleGlassContext = createContext(false);

export const useIsAppleDevice = () => useContext(AppleGlassContext);

export function AppleGlassProvider({ children }: { children: ReactNode }) {
  const [isApple, setIsApple] = useState(false);

  useEffect(() => {
    const apple = isAppleDevice();
    setIsApple(apple);
    if (apple) {
      document.documentElement.classList.add("apple-glass");
    } else {
      document.documentElement.classList.remove("apple-glass");
    }
    return () => {
      document.documentElement.classList.remove("apple-glass");
    };
  }, []);

  return (
    <AppleGlassContext.Provider value={isApple}>
      {children}
    </AppleGlassContext.Provider>
  );
}
