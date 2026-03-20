import * as React from "react";
import { NavLink as RouterNavLink, type NavLinkProps } from "react-router-dom";

import { cn } from "@/lib/utils";

export type AppNavLinkProps = Omit<NavLinkProps, "className"> & {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
};

const NavLink = React.forwardRef<HTMLAnchorElement, AppNavLinkProps>(
  ({ className, activeClassName, pendingClassName, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
