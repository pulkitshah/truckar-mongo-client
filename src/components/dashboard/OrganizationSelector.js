import { useState, useRef } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ChevronDown as ChevronDownIcon } from "../../icons/chevron-down";
import { OfficeBuilding as OfficeBuildingIcon } from "../../icons/office-building";
import { Check as CheckIcon } from "@mui/icons-material";

/**
 * OrganizationSelector Component
 *
 * Provides a dropdown menu to switch between organizations or view all organizations combined.
 * Displays in dashboard header for context switching.
 */
const OrganizationSelector = (props) => {
  const {
    organizations = [],
    selectedOrgId = null, // null means "All Organizations"
    onSelectOrg,
    ...other
  } = props;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSelectOrg = (orgId) => {
    onSelectOrg(orgId);
    handleClose();
  };

  // Find selected organization name
  const selectedOrg = organizations.find((org) => org._id === selectedOrgId);
  const displayName = selectedOrg ? selectedOrg.name : "All Organizations";

  // Don't show selector if user has 0 or 1 organization
  if (organizations.length <= 1) {
    return null;
  }

  return (
    <>
      <Button
        ref={anchorRef}
        onClick={handleOpen}
        endIcon={<ChevronDownIcon fontSize="small" />}
        sx={{
          color: "text.primary",
          backgroundColor: "background.paper",
          border: 1,
          borderColor: "divider",
          "&:hover": {
            backgroundColor: "action.hover",
          },
          textTransform: "none",
          px: 2,
          py: 1,
        }}
        {...other}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <OfficeBuildingIcon fontSize="small" />
          {!isMobile && (
            <Typography variant="body2" fontWeight={500}>
              {displayName}
            </Typography>
          )}
          {selectedOrgId && (
            <Chip
              label="1"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.75rem",
                backgroundColor: "primary.main",
                color: "primary.contrastText",
              }}
            />
          )}
          {!selectedOrgId && organizations.length > 0 && (
            <Chip
              label={organizations.length}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.75rem",
                backgroundColor: "info.main",
                color: "info.contrastText",
              }}
            />
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              minWidth: 280,
              mt: 1,
            },
          },
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {/* "All Organizations" option */}
        <MenuItem
          onClick={() => handleSelectOrg(null)}
          selected={selectedOrgId === null}
          sx={{
            py: 1.5,
            px: 2,
          }}
        >
          <ListItemIcon>
            {selectedOrgId === null && (
              <CheckIcon fontSize="small" color="primary" />
            )}
            {selectedOrgId !== null && <Box sx={{ width: 20 }} />}
          </ListItemIcon>
          <ListItemText
            primary="All Organizations"
            primaryTypographyProps={{
              variant: "body2",
              fontWeight: selectedOrgId === null ? 600 : 400,
            }}
          />
          <Chip
            label={organizations.length}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.70rem",
              ml: 1,
            }}
          />
        </MenuItem>

        {/* Divider */}
        <Box sx={{ borderTop: 1, borderColor: "divider", my: 0.5 }} />

        {/* Individual organizations */}
        {organizations.map((org) => (
          <MenuItem
            key={org._id}
            onClick={() => handleSelectOrg(org._id)}
            selected={selectedOrgId === org._id}
            sx={{
              py: 1.5,
              px: 2,
            }}
          >
            <ListItemIcon>
              {selectedOrgId === org._id && (
                <CheckIcon fontSize="small" color="primary" />
              )}
              {selectedOrgId !== org._id && <Box sx={{ width: 20 }} />}
            </ListItemIcon>
            <ListItemText
              primary={org.name}
              secondary={org.city || org.address?.city}
              primaryTypographyProps={{
                variant: "body2",
                fontWeight: selectedOrgId === org._id ? 600 : 400,
              }}
              secondaryTypographyProps={{
                variant: "caption",
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

OrganizationSelector.propTypes = {
  organizations: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      city: PropTypes.string,
      address: PropTypes.shape({
        city: PropTypes.string,
      }),
    })
  ),
  selectedOrgId: PropTypes.string, // null for "All Organizations"
  onSelectOrg: PropTypes.func.isRequired,
};

export default OrganizationSelector;
