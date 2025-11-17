import React, {
  useCallback,
  useMemo,
  useEffect,
  useState,
  useRef,
} from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import { useAuth } from "../../../hooks/use-auth";
import { invoiceApi } from "../../../api/invoice-api";
import { invoiceTable } from "../../grids/grid-columns";
import { checkJsonString } from "../../../utils/check-json-string";

const InvoicesByOrganisationTable = ({ onOpenDrawer, organisationId }) => {
  const { account } = useAuth();
  const [gridApi, setGridApi] = useState(null);
  const [error, setError] = useState(null);

  let orgId = useRef();

  useEffect(() => {
    try {
      orgId.current = organisationId;
    } catch (error) {
      console.log(error);
    }
  }, [organisationId]);

  console.log(orgId.current);

  const onGridReady = useCallback((params) => {
    const dataSource = {
      rowCount: undefined,
      getRows: async (params) => {
        setError(null);
        let filter = params.filterModel;
        const sort = params.sortModel;

        if (filter.customer) {
          let filteredCustomers = filter.customer.values.map((c) => {
            if (checkJsonString(c)) {
              return JSON.parse(c)._id;
            } else {
              return c;
            }
          });

          filter.customer = { filterType: "set", values: filteredCustomers };
        }

        filter.organisation = {
          filterType: "set",
          values: [orgId.current],
        };
        console.log(filter);
        try {
          const {
            data,
            count = 0,
            status,
            error: apiError,
          } = await invoiceApi.getInvoicesByAccount(
            JSON.stringify({
              account: account._id,
              startRow: params.startRow,
              endRow: params.endRow,
              filter,
            })
          );

          if (status !== 200 || apiError) {
            throw new Error(apiError || `Failed with status ${status}`);
          }

          params.successCallback(data, count);
        } catch (e) {
          console.error("Invoice org grid load failed", e);
          setError("Failed to load invoices for organisation.");
          params.failCallback([], 0);
          if (params.api && params.api.showNoRowsOverlay) {
            params.api.showNoRowsOverlay();
          }
        }
      },
    };
    params.api.setDatasource(dataSource);
    setGridApi(params.api);
  }, []);

  const defaultColDef = useMemo(() => {
    return {
      resizable: true,
      filter: true,
      menuTabs: ["filterMenuTab"],
    };
  }, []);
  return (
    <div key={organisationId} style={{ width: "100%", height: "100%" }}>
      {error && (
        <div style={{ color: "#d32f2f", marginBottom: 8 }}>{error}</div>
      )}
      <div
        style={{ width: "100%", height: "100%" }}
        className="ag-theme-balham"
      >
        <AgGridReact
          columnDefs={invoiceTable(account)}
          defaultColDef={defaultColDef}
          rowModelType={"infinite"}
          onGridReady={onGridReady}
          rowSelection="multiple"
          onSelectionChanged={async (event) => {
            const selectedNodes = event.api.getSelectedNodes();
            if (selectedNodes.length > 0) {
              const invoiceId = selectedNodes[0].data._id;
              try {
                const { data: completeInvoice } =
                  await invoiceApi.getInvoiceById(invoiceId);
                onOpenDrawer(completeInvoice, gridApi);
              } catch (error) {
                console.error("Failed to fetch complete invoice data:", error);
                // Fallback to grid data if API call fails
                onOpenDrawer(selectedNodes[0].data, gridApi);
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default InvoicesByOrganisationTable;
