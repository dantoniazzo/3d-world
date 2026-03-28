import { useIsMobile } from "shared/lib";
import { Leva } from "leva";

export type SettingsProps = {
  expanded?: boolean;
};

export const Settings = ({ expanded = false }: SettingsProps) => {
  const isSmallScreen = useIsMobile();
  console.log("is small screen: ", isSmallScreen);
  return (
    <Leva
      hidden={import.meta.env.DEV === false}
      collapsed={!expanded}
      theme={
        isSmallScreen
          ? {}
          : {
              sizes: {
                rootWidth: "450px",
                controlWidth: "160px",
              },
            }
      }
    />
  );
};
