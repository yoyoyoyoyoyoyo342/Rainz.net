import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
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
  return (
    <div className="w-full max-w-3xl mx-auto px-14">
      <Carousel opts={{ loop: true }}>
        <CarouselContent>
          {images.map((img, i) => (
            <CarouselItem key={i}>
              <img
                src={img.src}
                alt={img.alt}
                className="w-full rounded-2xl shadow-lg"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
