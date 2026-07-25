import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva("relative flex shrink-0 overflow-hidden", {
  variants: {
    size: {
      xs: "h-6 w-6",
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
      xl: "h-16 w-16",
      "2xl": "h-20 w-20",
      "3xl": "h-24 w-24",
      "4xl": "size-32",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      full: "rounded-full",
    },
    variant: {
      default: "",
      outline: "border border-border",
      ring: "ring-2 ring-primary ring-offset-2 ring-offset-background",
      muted: "",
    },
  },
  defaultVariants: { size: "md", radius: "full", variant: "ring" },
});

/** Fallback colours follow `variant`; font size follows `size`. */
const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-[inherit] font-black leading-none",
  {
    variants: {
      size: {
        xs: "text-[10px]",
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-xl",
        "2xl": "text-2xl",
        "3xl": "text-3xl",
        "4xl": "text-4xl",
      },
      variant: {
        default: "bg-gradient-to-br from-primary-500 to-teal-600 text-white",
        outline: "bg-background text-foreground",
        ring: "bg-gradient-to-br from-primary-400 to-teal-600 text-white",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { size: "md", variant: "default" },
  },
);

type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>["size"]>;
type AvatarVariant = NonNullable<
  VariantProps<typeof avatarVariants>["variant"]
>;

/**
 * Lets AvatarFallback scale its text and pick its colours from the size and
 * variant set once on the Avatar root, so callers don't repeat themselves.
 */
const AvatarContext = React.createContext<{
  size: AvatarSize;
  variant: AvatarVariant;
}>({ size: "md", variant: "default" });

export interface AvatarProps
  extends
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, radius, variant, ...props }, ref) => (
  <AvatarContext.Provider
    value={{ size: size ?? "md", variant: variant ?? "default" }}
  >
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size, radius, variant }), className)}
      {...props}
    />
  </AvatarContext.Provider>
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export interface AvatarFallbackProps
  extends
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof avatarFallbackVariants> {}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, size, variant, ...props }, ref) => {
  const inherited = React.useContext(AvatarContext);
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        avatarFallbackVariants({
          size: size ?? inherited.size,
          variant: variant ?? inherited.variant,
        }),
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  avatarVariants,
  avatarFallbackVariants,
};
