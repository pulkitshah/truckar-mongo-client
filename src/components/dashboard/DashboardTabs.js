import { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  LocalShipping as TruckIcon,
  TrendingUp as ChartIcon,
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

export default function DashboardTabs({ 
  overviewContent,
  customersContent,
  transportersContent,
  performanceContent 
}) {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            icon={<DashboardIcon />} 
            iconPosition="start" 
            label="Overview" 
            {...a11yProps(0)} 
          />
          <Tab 
            icon={<PeopleIcon />} 
            iconPosition="start" 
            label="Customers" 
            {...a11yProps(1)} 
          />
          <Tab 
            icon={<TruckIcon />} 
            iconPosition="start" 
            label="Transporters" 
            {...a11yProps(2)} 
          />
          <Tab 
            icon={<ChartIcon />} 
            iconPosition="start" 
            label="Performance" 
            {...a11yProps(3)} 
          />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        {overviewContent}
      </TabPanel>
      <TabPanel value={value} index={1}>
        {customersContent}
      </TabPanel>
      <TabPanel value={value} index={2}>
        {transportersContent}
      </TabPanel>
      <TabPanel value={value} index={3}>
        {performanceContent}
      </TabPanel>
    </Box>
  );
}
