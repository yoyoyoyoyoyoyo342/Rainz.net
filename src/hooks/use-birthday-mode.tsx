import { useEffect, useState } from "react";
import {
  applyBirthdayFavicon,
  daysUntilBirthdayEnds,
  isBirthdayDay,
  isBirthdayMode,
  rejnAgeOn,
  restoreFavicon,
} from "@/lib/birthday-mode";

export function useBirthdayMode() {
  const [active, setActive] = useState(() => isBirthdayMode());
  const [isBday, setIsBday] = useState(() => isBirthdayDay());

  useEffect(() => {
    const tick = () => {
      const a = isBirthdayMode();
      setActive(a);
      setIsBday(isBirthdayDay());
      if (a) {
        document.documentElement.classList.add("birthday-mode");
        applyBirthdayFavicon();
      } else {
        document.documentElement.classList.remove("birthday-mode");
        restoreFavicon();
      }
    };
    tick();
    // Re-check every hour in case the user keeps the tab open across midnight.
    const id = window.setInterval(tick, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return {
    active,
    isBirthday: isBday,
    daysLeft: daysUntilBirthdayEnds(),
    age: rejnAgeOn(),
  };
}
