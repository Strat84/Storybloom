import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Palette, Sparkles, Box, Heart } from 'lucide-react';
import animeExample from '@assets/anime image_1758732709903.png';
import chibiExample from '@assets/Chibi Image_1758733051980.png';
import threeDExample from '@assets/3d animation image_1758733193464.png';
import traditionalExample from '@assets/Traditional Cartoon_1758733335419.png';

export type CartoonStyle = 'traditional' | 'anime' | '3d' | 'chibi';

interface CartoonStyleOption {
  id: CartoonStyle;
  name: string;
  description: string;
  previewImage?: string; // Will be populated when user provides images
}

const cartoonStyles: CartoonStyleOption[] = [
  {
    id: 'traditional',
    name: 'Traditional Cartoon',
    description: 'Classic cartoon style with bold outlines and vibrant colors',
    previewImage: traditionalExample,
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese animation style with expressive characters',
    previewImage: animeExample,
  },
  {
    id: '3d',
    name: '3D Animation',
    description: 'Modern 3D rendered style with depth and dimension',
    previewImage: threeDExample,
  },
  {
    id: 'chibi',
    name: 'Chibi',
    description: 'Cute, small character style with oversized heads',
    previewImage: chibiExample,
  },
];

interface CartoonStyleSelectorProps {
  selectedStyle: CartoonStyle;
  onStyleChange: (style: CartoonStyle) => void;
}

export function CartoonStyleSelector({ selectedStyle, onStyleChange }: CartoonStyleSelectorProps) {
  return (
    <div className="container mx-auto px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold mb-4">
            Choose Your Cartoon Style
          </h2>
          <p className="text-muted-foreground font-story text-lg">
            Select the visual style for your storybook illustrations
          </p>
        </div>

        <div className="relative">
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {cartoonStyles.map((style) => (
                <CarouselItem key={style.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card
                      className={cn(
                        "relative cursor-pointer transition-all duration-300 hover-elevate",
                        selectedStyle === style.id
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "hover:shadow-lg"
                      )}
                      onClick={() => onStyleChange(style.id)}
                      data-testid={`style-card-${style.id}`}
                    >
                      <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                        {/* Placeholder for style preview image */}
                        {style.previewImage ? (
                          <img
                            src={style.previewImage}
                            alt={`${style.name} example`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                              {style.id === 'traditional' && <Palette className="w-8 h-8 text-primary" />}
                              {style.id === 'anime' && <Sparkles className="w-8 h-8 text-primary" />}
                              {style.id === '3d' && <Box className="w-8 h-8 text-primary" />}
                              {style.id === 'chibi' && <Heart className="w-8 h-8 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Preview coming soon
                            </p>
                          </div>
                        )}
                        
                        {selectedStyle === style.id && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 font-display">
                          {style.name}
                        </h3>
                        <p className="text-sm text-muted-foreground font-story">
                          {style.description}
                        </p>
                      </div>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" data-testid="button-carousel-prev" />
            <CarouselNext className="hidden md:flex" data-testid="button-carousel-next" />
          </Carousel>
        </div>

        {/* Mobile navigation dots */}
        <div className="flex justify-center mt-6 gap-2 md:hidden">
          {cartoonStyles.map((style) => (
            <button
              key={style.id}
              data-testid={`dot-${style.id}`}
              onClick={() => onStyleChange(style.id)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                selectedStyle === style.id
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
              )}
              aria-label={`Select ${style.name} style`}
            />
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{cartoonStyles.find(s => s.id === selectedStyle)?.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}