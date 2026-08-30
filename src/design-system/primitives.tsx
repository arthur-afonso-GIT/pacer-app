import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementType,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import './primitives.css'

const cx = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ')
const buttonStyles = cva('ds-button', {
  variants: {
    variant: {
      primary: 'ds-button--primary',
      secondary: 'ds-button--secondary',
      ghost: 'ds-button--ghost',
      danger: 'ds-button--danger',
    },
    size: { sm: 'ds-button--sm', md: 'ds-button--md', lg: 'ds-button--lg' },
    fullWidth: { true: 'ds-button--full' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})
export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="ds-spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  ),
)
Button.displayName = 'Button'

const iconStyles = cva('ds-icon-button', {
  variants: {
    size: { sm: 'ds-icon-button--sm', md: '', lg: 'ds-icon-button--lg' },
  },
  defaultVariants: { size: 'md' },
})
export interface IconButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconStyles> {}
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={iconStyles({ size, className })}
      {...props}
    />
  ),
)
IconButton.displayName = 'IconButton'

type FieldBase = { label: string; error?: string; hint?: string }
export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldBase
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const auto = useId()
    const fieldId = id ?? auto
    const messageId = `${fieldId}-message`
    return (
      <div className="ds-field">
        <label className="ds-label" htmlFor={fieldId}>
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className="ds-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
        />
        {error ? (
          <span id={messageId} className="ds-error" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span id={messageId} className="ds-help">
            {hint}
          </span>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldBase
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const auto = useId()
    const fieldId = id ?? auto
    const messageId = `${fieldId}-message`
    return (
      <div className="ds-field">
        <label className="ds-label" htmlFor={fieldId}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          className="ds-textarea"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
        />
        {error ? (
          <span id={messageId} className="ds-error" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span id={messageId} className="ds-help">
            {hint}
          </span>
        ) : null}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

export interface AvatarProps extends ComponentPropsWithoutRef<
  typeof AvatarPrimitive.Root
> {
  src?: string
  alt?: string
  fallback: string
  size?: 'sm' | 'md' | 'lg'
  fallbackDelayMs?: number
}
export const Avatar = ({
  src,
  alt = '',
  fallback,
  size = 'md',
  fallbackDelayMs = 0,
  className,
  ...props
}: AvatarProps) => (
  <AvatarPrimitive.Root
    className={cx('ds-avatar', `ds-avatar--${size}`, className)}
    {...props}
  >
    <AvatarPrimitive.Image className="ds-avatar-image" src={src} alt={alt} />
    <AvatarPrimitive.Fallback
      className="ds-avatar-fallback"
      delayMs={fallbackDelayMs}
    >
      {fallback}
    </AvatarPrimitive.Fallback>
  </AvatarPrimitive.Root>
)

const badgeStyles = cva('ds-badge', {
  variants: {
    tone: {
      neutral: 'ds-badge--neutral',
      success: 'ds-badge--success',
      warning: 'ds-badge--warning',
      danger: 'ds-badge--danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
})
export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}
export const Badge = ({ tone, className, ...props }: BadgeProps) => (
  <span className={badgeStyles({ tone, className })} {...props} />
)

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  variant?: 'outlined' | 'raised' | 'subtle'
}
export const Surface = ({
  as: Component = 'div',
  variant = 'outlined',
  className,
  ...props
}: SurfaceProps) => (
  <Component
    className={cx(
      'ds-surface',
      variant !== 'outlined' && `ds-surface--${variant}`,
      className,
    )}
    {...props}
  />
)
export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: string | number
  height?: string | number
}
export const Skeleton = ({
  className,
  width,
  height,
  style,
  ...props
}: SkeletonProps) => (
  <span
    className={cx('ds-skeleton', className)}
    aria-busy="true"
    style={{ width, height, ...style }}
    {...props}
  />
)
export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}
export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) => (
  <div className={cx('ds-empty', className)} {...props}>
    {icon}
    <h3 className="ds-empty__title">{title}</h3>
    {description && <p className="ds-empty__body">{description}</p>}
    {action}
  </div>
)
export interface PointBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  points: number
}
export const PointBadge = ({
  points,
  className,
  ...props
}: PointBadgeProps) => (
  <span className={cx('ds-point-badge', className)} {...props}>
    {points >= 0 ? '+' : ''}
    {points} pts
  </span>
)
export interface StreakIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  days: number
}
export const StreakIndicator = ({
  days,
  className,
  ...props
}: StreakIndicatorProps) => (
  <span
    className={cx('ds-streak', className)}
    aria-label={`Sequência de ${days} ${days === 1 ? 'dia' : 'dias'}`}
    {...props}
  >
    <span className="ds-streak__icon" aria-hidden="true">
      🔥
    </span>
    <span>{days}</span>
  </span>
)
