import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Divider,
  Grid,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useDispatch, useSelector } from "../../../store";
import { vehicleApi } from "../../../api/vehicle-api";
import { AuthGuard } from "../../../components/authentication/auth-guard";
import { OnBoardingGuard } from "../../../components/authentication/onboarding-guard";
import { DashboardLayout } from "../../../components/dashboard/dashboard-layout";
import { VehicleDrawer } from "../../../components/dashboard/vehicle/vehicle-drawer";
import VehicleGrid from "../../../components/dashboard/vehicle/vehicle-grid";
import { useAuth } from "../../../hooks/use-auth";
import { Plus as PlusIcon } from "../../../icons/plus";
import { organisationApi } from "../../../api/organisation-api";

const VehicleListInner = styled("div", {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  flexGrow: 1,
  overflow: "hidden",
  paddingBottom: theme.spacing(8),
  paddingTop: theme.spacing(8),
  zIndex: 1,
  [theme.breakpoints.up("lg")]: {
    marginRight: -500,
  },
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    [theme.breakpoints.up("lg")]: {
      marginRight: 0,
    },
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const OTHER_TAB_VALUES = Object.freeze({
  TRANSPORTER: "transporter",
  UNASSIGNED: "unassigned",
});

const VehicleList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { account } = useAuth();
  const rootRef = useRef(null);
  const { vehicles } = useSelector((state) => state.vehicles);
  const { organisations } = useSelector((state) => state.organisations);
  const [drawer, setDrawer] = useState({ isOpen: false, vehicle: null });
  const [primaryTab, setPrimaryTab] = useState("my");
  const [organisationTab, setOrganisationTab] = useState(null);
  const [otherTab, setOtherTab] = useState(null);

  const handleOpenDrawer = (params) => {
    setDrawer({ isOpen: true, vehicle: params.row });
  };

  const handleCloseDrawer = () => {
    setDrawer({ isOpen: false, vehicle: null });
  };

  const loadVehicles = useCallback(async () => {
    if (!account?._id) return;
    try {
      await vehicleApi.getVehiclesByAccount(dispatch, account._id);
    } catch (err) {
      console.error(err);
    }
  }, [account?._id, dispatch]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    if (account?._id && organisationApi?.getOrganisationsByAccount) {
      try {
        organisationApi.getOrganisationsByAccount(dispatch, account._id);
      } catch (err) {
        console.error(err);
      }
    }
  }, [account?._id, dispatch]);

  // My Vehicles: only those linked to an organisation
  const myVehicles = useMemo(() => {
    if (!vehicles?.length) return [];
    return vehicles.filter((v) => Boolean(v?.organisation));
  }, [vehicles]);

  const myVehicleIds = useMemo(
    () => new Set(myVehicles.map((v) => v?.id || v?._id).filter(Boolean)),
    [myVehicles]
  );

  // Other Vehicles: anything not in myVehicles
  const otherVehicles = useMemo(() => {
    if (!vehicles?.length) return [];
    return vehicles.filter((v) => {
      const id = v?.id || v?._id;
      return !(id && myVehicleIds.has(id));
    });
  }, [vehicles, myVehicleIds]);

  const transporterOtherVehicles = useMemo(
    () => otherVehicles.filter((v) => Boolean(v?.transporter)),
    [otherVehicles]
  );

  const unassignedOtherVehicles = useMemo(
    () => otherVehicles.filter((v) => !v?.transporter),
    [otherVehicles]
  );

  // Organisations for my vehicles subtabs
  const availableOrganisations = useMemo(() => {
    if (organisations?.length) return organisations;
    const map = new Map();
    myVehicles.forEach((v) => {
      const org = v?.organisation;
      const id = org?.id || org?._id;
      if (id && !map.has(id)) map.set(id, org);
    });
    return Array.from(map.values());
  }, [organisations, myVehicles]);

  const vehiclesByOrganisation = useMemo(() => {
    const ids = new Set(
      (availableOrganisations || []).map((o) => o?.id || o?._id).filter(Boolean)
    );
    if (!ids.size) return {};
    return myVehicles.reduce((acc, v) => {
      const id = v?.organisation?.id || v?.organisation?._id;
      if (!id || !ids.has(id)) return acc;
      if (!acc[id]) acc[id] = [];
      acc[id].push(v);
      return acc;
    }, {});
  }, [myVehicles, availableOrganisations]);

  const firstOrgId =
    availableOrganisations && availableOrganisations.length
      ? availableOrganisations[0]?.id || availableOrganisations[0]?._id
      : null;
  const activeOrganisationTab = organisationTab || firstOrgId || null;

  const displayedMyVehicles = activeOrganisationTab
    ? vehiclesByOrganisation[activeOrganisationTab] || []
    : myVehicles;

  const defaultOtherTab = useMemo(() => {
    if (transporterOtherVehicles.length) return OTHER_TAB_VALUES.TRANSPORTER;
    if (unassignedOtherVehicles.length) return OTHER_TAB_VALUES.UNASSIGNED;
    return null;
  }, [transporterOtherVehicles.length, unassignedOtherVehicles.length]);

  const displayedOtherVehicles = useMemo(() => {
    const tab = otherTab || defaultOtherTab;
    if (!tab) return otherVehicles;
    if (tab === OTHER_TAB_VALUES.UNASSIGNED) return unassignedOtherVehicles;
    if (tab === OTHER_TAB_VALUES.TRANSPORTER) return transporterOtherVehicles;
    return otherVehicles;
  }, [
    otherTab,
    defaultOtherTab,
    otherVehicles,
    transporterOtherVehicles,
    unassignedOtherVehicles,
  ]);

  const handlePrimaryTabChange = (event, value) => {
    setPrimaryTab(value);
  };

  const handleOrganisationTabChange = (event, value) => {
    setOrganisationTab(value || null);
  };

  const handleOtherTabChange = (event, value) => {
    setOtherTab(value || null);
  };

  return (
    <>
      <Head>
        <title>Dashboard: Vehicle List | Truckar</title>
      </Head>
      <Box
        component="main"
        ref={rootRef}
        sx={{
          backgroundColor: "background.paper",
          display: "flex",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <VehicleListInner open={drawer.isOpen}>
          <Box sx={{ px: 3 }}>
            <Grid container justifyContent="space-between" spacing={3}>
              <Grid item>
                <Typography variant="h4">{t("Vehicles")}</Typography>
              </Grid>
              <Grid item>
                <NextLink href="/dashboard/vehicles/new" passHref>
                  <Button
                    component="a"
                    startIcon={<PlusIcon fontSize="small" />}
                    variant="contained"
                  >
                    Add
                  </Button>
                </NextLink>
              </Grid>
            </Grid>
          </Box>
          <Box
            sx={{
              mt: 3,
              px: 3,
              height: "70vh",
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Divider />
            <Tabs
              value={primaryTab}
              onChange={handlePrimaryTabChange}
              sx={{ mt: 2 }}
            >
              <Tab label={t("My Vehicles")} value="my" />
              <Tab label={t("Other Vehicles")} value="other" />
            </Tabs>
            <Box sx={{ flexGrow: 1, minHeight: 0, mt: 2 }}>
              {primaryTab === "my" ? (
                availableOrganisations.length ? (
                  <>
                    <Tabs
                      value={activeOrganisationTab}
                      onChange={handleOrganisationTabChange}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      {availableOrganisations.map((organisation) => {
                        const organisationId =
                          organisation?.id || organisation?._id;
                        if (!organisationId) return null;
                        return (
                          <Tab
                            key={organisationId}
                            label={
                              organisation?.name || "Untitled Organisation"
                            }
                            value={organisationId}
                          />
                        );
                      })}
                    </Tabs>
                    <Box
                      sx={{
                        flexGrow: 1,
                        minHeight: 0,
                        mt: 2,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <VehicleGrid
                        onOpenDrawer={handleOpenDrawer}
                        vehicles={displayedMyVehicles}
                        showTransporterColumn={false}
                      />
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      flexGrow: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <VehicleGrid
                      onOpenDrawer={handleOpenDrawer}
                      vehicles={myVehicles}
                      showTransporterColumn={false}
                    />
                  </Box>
                )
              ) : (
                <Box
                  sx={{
                    flexGrow: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {(transporterOtherVehicles.length ||
                    unassignedOtherVehicles.length) && (
                    <Tabs
                      value={otherTab || defaultOtherTab}
                      onChange={handleOtherTabChange}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      {transporterOtherVehicles.length > 0 && (
                        <Tab
                          key={OTHER_TAB_VALUES.TRANSPORTER}
                          label={t("With Transporter")}
                          value={OTHER_TAB_VALUES.TRANSPORTER}
                        />
                      )}
                      {unassignedOtherVehicles.length > 0 && (
                        <Tab
                          key={OTHER_TAB_VALUES.UNASSIGNED}
                          label={t("Unassigned")}
                          value={OTHER_TAB_VALUES.UNASSIGNED}
                        />
                      )}
                    </Tabs>
                  )}
                  <Box
                    sx={{
                      flexGrow: 1,
                      minHeight: 0,
                      mt: 2,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <VehicleGrid
                      onOpenDrawer={handleOpenDrawer}
                      vehicles={displayedOtherVehicles}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </VehicleListInner>
        <VehicleDrawer
          containerRef={rootRef}
          onOpen={handleOpenDrawer}
          onClose={handleCloseDrawer}
          open={drawer.isOpen}
          vehicle={drawer.vehicle}
        />
      </Box>
    </>
  );
};

VehicleList.getLayout = (page) => (
  <AuthGuard>
    <OnBoardingGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </OnBoardingGuard>
  </AuthGuard>
);

export default VehicleList;
