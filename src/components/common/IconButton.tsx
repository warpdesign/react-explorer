import { Button, ButtonProps, PolymorphicComponentProps } from '@mantine/core'
import { IconProps } from '@tabler/icons-react'
import React from 'react'

export interface IconButtonProps extends PolymorphicComponentProps<'button', ButtonProps> {
    icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>
    iconProps?: IconProps
    active?: boolean
}

export const IconButton = ({ icon: Icon, iconProps, children, active, onClick, ...rest }: IconButtonProps) => (
    <Button
        leftSection={<Icon size={18} stroke={1.5} {...iconProps} />}
        variant={active ? 'light' : 'subtle'}
        color={active ? undefined : 'button'}
        onClick={active ? undefined : onClick}
        {...rest}
    >
        {children}
    </Button>
)
