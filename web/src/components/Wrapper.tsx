import { Box } from "@chakra-ui/layout";
import React from "react";

//creating a type here b/c we're reusing this in Layout
export type WrapperVariant = "small" | "regular";

interface Props {
    variant?: WrapperVariant;
}

//box element in chakra is kind of like a div, can style however you want
export const Wrapper: React.FC<Props> = ({ children, variant = "regular" }) => {
    return (
        <Box
            mt={8}
            mx="auto"
            maxW={variant === "regular" ? "800px" : "400px"}
            w="100%"
        >
            {children}
        </Box>
    );
};
