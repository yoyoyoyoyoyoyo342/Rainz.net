import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import carousel1 from "@/assets/carousel-1.png";
import carousel2 from "@/assets/carousel-2.png";
import carousel3 from "@/assets/carousel-3.png";
import carousel4 from "@/assets/carousel-4.png";
import carousel5 from "@/assets/carousel-5.png";

const images = [
  { src: carousel1, alt: "What is Rainz?" },
  { src: carousel2, alt: "Why we made it" },
  { src: carousel3, alt: "Our mission" },
  { src: carousel4, alt: "How we get our data" },
  { src: carousel5, alt: "Privacy and data handling" },
];

export function RainzImageCarousel() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {images.map((img, i) => (
            <img
              key={i}
              src={img.src}
              alt={img.alt}
              className="w-full flex-shrink-0 rounded-2xl shadow-lg"
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute -left-12 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hidden sm:flex"
        onClick={prev}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute -right-12 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hidden sm:flex"
        onClick={next}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
