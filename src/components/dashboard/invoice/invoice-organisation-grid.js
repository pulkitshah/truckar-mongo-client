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
        let { data, count = 0 } = await invoiceApi.getInvoicesByAccount(
          JSON.stringify({
            account: account._id,
            startRow: params.startRow,
            endRow: params.endRow,
            filter,
          })
        );

        console.log(data);

        params.successCallback(data, count);
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
          onSelectionChanged={(event) => {
            event.api
              .getSelectedNodes()
              .map((node) => onOpenDrawer(node.data, gridApi));
          }}
        />
      </div>
    </div>
  );
};

export default InvoicesByOrganisationTable;
