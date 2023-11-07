import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import Head from "next/head";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { Storage } from "aws-amplify";
import {
  Box,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Container,
  Dialog,
  Divider,
  FormControlLabel,
  Grid,
  Hidden,
  Link,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { lrApi } from "../../../api/lr-api";
import { useAuth } from "../../../hooks/use-auth";
import { AuthGuard } from "../../../components/authentication/auth-guard";
import { OnBoardingGuard } from "../../../components/authentication/onboarding-guard";
import { DashboardLayout } from "../../../components/dashboard/dashboard-layout";
import { LrSummary } from "../../../components/dashboard/lr/lr-summary";
import { useMounted } from "../../../hooks/use-mounted";
import { Calendar as CalendarIcon } from "../../../icons/calendar";
import { PencilAlt as PencilAltIcon } from "../../../icons/pencil-alt";
import { useDispatch, useSelector } from "../../../store";
import { gtm } from "../../../lib/gtm";
import { LrForm } from "../../../components/dashboard/lr/lr-drawer";
import LrPDFs from "../../../components/dashboard/lr/LrPDFs";
import moment from "moment";

const LrDetails = () => {
  const router = useRouter();
  const isMounted = useMounted();
  const [isEditing, setIsEditing] = useState(false);
  const [printRates, setPrintRates] = useState(false);
  const [viewPDF, setViewPDF] = useState(false);

  const [logo, setLogo] = useState();
  const [lr, setLr] = useState();
  const { lrId } = router.query;

  const LrFormat = LrPDFs["standardLoose"];

  const togglePrintRates = () => {
    setPrintRates(!printRates);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    gtm.push({ event: "page_view" });
  }, []);

  const getLr = useCallback(async () => {
    try {
      let { data } = await lrApi.getLrById(lrId);
      setLr(data);
    } catch (err) {
      console.error(err);
    }
  }, [isMounted]);

  useEffect(
    () => {
      getLr();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!lr) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Dashboard: Lr Details | Truckar</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ mb: 4 }}>
            <NextLink href="/dashboard/lrs" passHref>
              <Link
                color="textPrimary"
                component="a"
                sx={{
                  alignItems: "center",
                  display: "flex",
                }}
              >
                <ArrowBackIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="subtitle2">Lrs</Typography>
              </Link>
            </NextLink>
          </Box>
          <Box sx={{ mb: 4 }}>
            <Grid container justifyContent="space-between" spacing={3}>
              <Grid item>
                <Typography variant="h4">{lr.number}</Typography>
                <Box
                  sx={{
                    alignItems: "center",
                    display: "flex",
                    ml: -1,
                    mt: 1,
                  }}
                >
                  <Typography
                    color="textSecondary"
                    variant="body2"
                    sx={{ ml: 1 }}
                  >
                    Placed on
                  </Typography>
                  <CalendarIcon
                    color="action"
                    fontSize="small"
                    sx={{ ml: 1 }}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {moment(lr.lrDate).format("DD/MM/YYYY")}
                  </Typography>
                </Box>
              </Grid>
              <Grid item sx={{ ml: -2 }}>
                <Button
                  endIcon={<PencilAltIcon fontSize="small" />}
                  variant="outlined"
                  sx={{ mx: 2 }}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={printRates}
                      onChange={togglePrintRates}
                      name="checkedF"
                    />
                  }
                  label="Print Rates"
                />
                <Hidden smDown>
                  <Button
                    variant="outlined"
                    sx={{ ml: 2 }}
                    onClick={() => setViewPDF(true)}
                  >
                    Preview
                  </Button>
                </Hidden>
                {
                  <PDFDownloadLink
                    document={
                      <LrFormat
                        logo={logo}
                        lr={{
                          ...lr.deliveries.lr,
                          delivery: lr.deliveries,
                          order: lr,
                        }}
                        printRates={printRates}
                      />
                    }
                    fileName={`Lr - ${lr.deliveries.lr.organisation.initials}-${lr.deliveries.lr.lrNo}`}
                    style={{
                      textDecoration: "none",
                    }}
                  >
                    <Button variant="outlined" sx={{ ml: 2 }}>
                      Download
                    </Button>
                  </PDFDownloadLink>
                }
              </Grid>
            </Grid>
          </Box>
          {!isEditing ? (
            <LrSummary order={lr} getLr={getLr} />
          ) : (
            <LrForm onCancel={handleCancel} getLr={getLr} lr={lr} />
          )}
        </Container>
      </Box>
      <Dialog fullScreen open={viewPDF}>
        <Box height="100%" display="flex" flexDirection="column">
          <Box bgcolor="common.white" p={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setViewPDF(false)}
            >
              Back
            </Button>
          </Box>
          <Box flexGrow={1}>
            <PDFViewer
              width="100%"
              height="100%"
              style={{
                border: "none",
              }}
            >
              <LrFormat
                lr={{ ...lr.deliveries.lr, delivery: lr.deliveries, order: lr }}
                printRates={printRates}
              />
            </PDFViewer>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

LrDetails.getLayout = (page) => (
  <AuthGuard>
    <OnBoardingGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </OnBoardingGuard>
  </AuthGuard>
);

export default LrDetails;
