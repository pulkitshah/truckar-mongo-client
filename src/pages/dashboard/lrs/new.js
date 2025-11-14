import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import Head from "next/head";
import { Box, Breadcrumbs, Container, Link, Typography } from "@mui/material";
import { useMounted } from "../../../hooks/use-mounted";
import { AuthGuard } from "../../../components/authentication/auth-guard";
import { DashboardLayout } from "../../../components/dashboard/dashboard-layout";
import { LrCreateForm } from "../../../components/dashboard/lr/lr-create-form";
import { gtm } from "../../../lib/gtm";
import { OnBoardingGuard } from "../../../components/authentication/onboarding-guard";
import { orderApi } from "../../../api/order-api";

const LrCreate = () => {
  const router = useRouter();
  const isMounted = useMounted();
  const [order, setOrder] = useState();

  useEffect(() => {
    gtm.push({ event: "page_view" });
  }, []);
  const { deliveryId, orderId: rawOrderId } = router.query;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  const getOrder = useCallback(async () => {
    // Avoid fetching until router is ready and we have an orderId
    if (!router.isReady || !orderId) {
      return;
    }
    try {
      const response = await orderApi.getOrderById(orderId);
      if (isMounted()) {
        let next = response && !response.error ? response.data : null;
        // Normalize common API shapes
        if (Array.isArray(next)) {
          next = next[0] || null;
        }
        // Only set when it looks like an order object
        if (next && typeof next === "object") {
          setOrder(next);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [isMounted, orderId, router.isReady]);

  useEffect(() => {
    getOrder();
  }, [getOrder]);

  return (
    <>
      <Head>
        <title>Dashboard: Order Create | Truckar</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4">Create a new LR</Typography>
            <Breadcrumbs separator="/" sx={{ mt: 1 }}>
              <NextLink href="/dashboard" passHref>
                <Link variant="subtitle2">Dashboard</Link>
              </NextLink>
              <NextLink href="/dashboard" passHref>
                <Link color="primary" variant="subtitle2">
                  Management
                </Link>
              </NextLink>
              <Typography color="textSecondary" variant="subtitle2">
                Create LR
              </Typography>
            </Breadcrumbs>
          </Box>
          {order && <LrCreateForm order={order} deliveryId={deliveryId} />}
        </Container>
      </Box>
    </>
  );
};

LrCreate.getLayout = (page) => (
  <AuthGuard>
    <OnBoardingGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </OnBoardingGuard>
  </AuthGuard>
);

export default LrCreate;
