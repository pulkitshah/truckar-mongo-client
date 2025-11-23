import React, { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { vehicleTable } from "../../grids/grid-columns";

const Table = ({ vehicles, onOpenDrawer, showTransporterColumn = true }) => {
  const columns = useMemo(() => {
    if (showTransporterColumn) {
      return vehicleTable;
    }

    return vehicleTable.filter((column) => column.field !== "transporter");
  }, [showTransporterColumn]);

  return (
    <DataGrid
      onRowClick={onOpenDrawer}
      rows={vehicles || []}
      columns={columns}
      disableSelectionOnClick
      experimentalFeatures={{ newEditingApi: true }}
      getRowId={(row) => row.id || row._id}
      sx={{
        flexGrow: 1,
        minHeight: 360,
        "& .MuiDataGrid-virtualScroller": {
          minHeight: 320,
        },
      }}
    />
  );
};

export default Table;
