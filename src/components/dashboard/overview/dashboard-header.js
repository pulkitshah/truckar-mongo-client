import {
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import OrganizationSelector from "../OrganizationSelector";
import { DashboardSectionTabs } from "../dashboard-section-tabs";
import { Refresh as RefreshIcon } from "../../../icons/refresh";
import { Reports as ReportsIcon } from "../../../icons/reports";

export const DashboardHeader = ({
  greeting,
  firstName,
  sections,
  activeTab,
  onTabChange,
  period,
  onPeriodChange,
  groupBy,
  onGroupByChange,
  organizations,
  selectedOrganization,
  onOrganizationChange,
  onRefresh,
  onReportsClick,
}) => (
  <Box
    sx={{
      position: "sticky",
      top: 64,
      zIndex: 10,
      bgcolor: "background.default",
      borderBottom: 1,
      borderColor: "divider",
      pb: 2,
      mb: 4,
    }}
  >
    <Container maxWidth="xl">
      <Box sx={{ pt: 2 }}>
        <Grid container justifyContent="space-between" spacing={3}>
          <Grid item>
            <Typography variant="h4">
              {greeting}
              {firstName && `, ${firstName}`}
            </Typography>
            <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
              Here's what's happening with your logistics today
            </Typography>
          </Grid>
          <Grid
            item
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <OrganizationSelector
              organizations={organizations}
              selectedOrgId={selectedOrganization}
              onSelectOrg={onOrganizationChange}
            />
            <Button
              startIcon={<RefreshIcon fontSize="small" />}
              onClick={onRefresh}
              variant="outlined"
              size="small"
            >
              Refresh
            </Button>
            <Button
              startIcon={<ReportsIcon fontSize="small" />}
              variant="outlined"
              size="small"
              onClick={onReportsClick}
            >
              Reports
            </Button>
            <TextField
              value={period}
              onChange={onPeriodChange}
              label="Period"
              select
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="week">Last 7 days</MenuItem>
              <MenuItem value="month">Last 30 days</MenuItem>
              <MenuItem value="quarter">Last 90 days</MenuItem>
              <MenuItem value="year">Last year</MenuItem>
            </TextField>
            <TextField
              value={groupBy}
              onChange={onGroupByChange}
              label="View By"
              select
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="quarter">Quarter</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ mt: 3 }}>
        <DashboardSectionTabs
          sections={sections}
          value={activeTab}
          onChange={onTabChange}
        />
      </Box>
    </Container>
  </Box>
);
