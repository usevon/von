type BrandCarouselProps = {
  className?: string;
};

export const BrandCarousel = (props: BrandCarouselProps) => {
  const brands = ["brand1", "brand2", "brand3", "brand4", "brand5"];

  return (
    <section className={props.className}>
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-2 place-items-center gap-x-6 gap-y-10 sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-5 lg:gap-12">
          {brands.map((brand) => (
            <div
              className="flex h-8 items-center font-medium text-muted-foreground text-sm uppercase tracking-widest"
              key={brand}
            >
              {brand}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
