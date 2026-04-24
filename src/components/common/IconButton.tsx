import { Button, ButtonProps, PolymorphicComponentProps } from '@mantine/core'
import { IconProps } from '@tabler/icons-react'
import React from 'react'

export interface IconButtonProps extends PolymorphicComponentProps<'button', ButtonProps> {
    icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>
    iconProps?: IconProps
    active?: boolean
}

export const IconButton = ({ icon: Icon, iconProps, children, active, ...rest }: IconButtonProps) => (
    <Button
        leftSection={<Icon size={18} stroke={1.5} {...iconProps} />}
        variant={active ? 'light' : 'subtle'}
        color={active ? undefined : 'button'}
        style={{ pointerEvents: active ? 'none' : 'auto' }}
        {...rest}
    >
        {children}
    </Button>
)
