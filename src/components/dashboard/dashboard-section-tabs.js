import PropTypes from "prop-types";
import { Box, Tab, Tabs } from "@mui/material";

export const DashboardSectionTabs = ({ sections, value, onChange }) => (
  <Box
    sx={{
      borderBottom: 1,
      borderColor: "divider",
    }}
  >
    <Tabs
      value={value}
      onChange={(event, newValue) => onChange(newValue)}
      variant="scrollable"
      allowScrollButtonsMobile
      aria-label="Dashboard section navigation"
      sx={{
        minHeight: 72,
        ".MuiTabs-indicator": {
          height: 3,
          borderRadius: "3px 3px 0 0",
          backgroundColor: "primary.main",
        },
        ".MuiTab-root": {
          minHeight: 72,
          textTransform: "none",
          fontWeight: 600,
          alignItems: "center",
          gap: 0.75,
          px: 3,
          color: "text.secondary",
        },
        ".MuiTab-root.Mui-selected": {
          color: "text.primary",
        },
        ".MuiTab-wrapper": {
          flexDirection: "column",
          rowGap: 6,
        },
      }}
    >
      {sections.map((section) => (
        <Tab
          key={section.id}
          value={section.id}
          disableRipple
          icon={section.icon}
          iconPosition="top"
          label={section.label}
        />
      ))}
    </Tabs>
  </Box>
);

DashboardSectionTabs.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
