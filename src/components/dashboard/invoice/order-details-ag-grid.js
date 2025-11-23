import React, { useCallback, useRef, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-enterprise";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

import { orderTableForCreateInvoice } from "../../grids/grid-columns";
import { deliveryApi } from "../../../api/delivery-api";
import { useAuth } from "../../../hooks/use-auth";

const OrderDetailsGrid = ({ formik }) => {
  const gridRef = useRef();
  const { account } = useAuth();
  const dataRef = useRef(new Map());

  const hasAccount = Boolean(account?._id);
  const selectedCustomerId = formik.values.customer?._id;
  const { setFieldValue } = formik;

  useEffect(() => {
    if (!Array.isArray(formik.values.deliveries)) {
      return;
    }

    const nextMap = new Map(dataRef.current);

    formik.values.deliveries.forEach((deliveryRow) => {
      const deliveryId = deliveryRow?.delivery?._id;

      if (deliveryId) {
        nextMap.set(deliveryId, deliveryRow);
      }
    });

    dataRef.current = nextMap;
  }, [formik.values.deliveries]);
  const dataSource = useMemo(
    () => ({
    getRows: async (params) => {
      if (!hasAccount || !selectedCustomerId) {
        console.warn("OrderDetailsGrid:getRows prerequisites missing", {
          hasAccount,
          selectedCustomerId,
        });
        params.success({ rowData: [], rowCount: 0 });
        return;
      }

      const filter = params.request.filterModel || {};

      const requestPayload = {
        account: account?._id,
        customer: selectedCustomerId,
        startRow: params.request.startRow || 0,
        endRow: params.request.endRow || 100,
        filter,
      };

      console.info("OrderDetailsGrid:getRows request", requestPayload);

      let {
        data,
        count = 0,
        error,
      } = await deliveryApi.getDeliveriesByCustomer(
        JSON.stringify(requestPayload)
      );
      if (!error) {
        const nextMap = new Map(dataRef.current);

        (Array.isArray(data) ? data : []).forEach((deliveryRow) => {
          const deliveryId = deliveryRow?.delivery?._id;

          if (deliveryId) {
            nextMap.set(deliveryId, deliveryRow);
          }
        });

        dataRef.current = nextMap;

        console.info("OrderDetailsGrid:getRows success", {
          fetched: Array.isArray(data) ? data.length : 0,
          cached: dataRef.current.size,
          totalCount: count,
          sample: Array.isArray(data) && data.length ? data[0] : null,
        });

        params.success({
          rowData: Array.isArray(data) ? data : [],
          rowCount: count || (Array.isArray(data) ? data.length : 0),
        });
      } else {
        console.error("OrderDetailsGrid:getRows failed", error);
        params.fail();
      }

      // params.successCallback(data, count);
    },
    }),
    [account?._id, hasAccount, selectedCustomerId]
  );

  const onGridReady = useCallback(
    (params) => {
      params.api.setServerSideDatasource(dataSource);
      console.info("OrderDetailsGrid:grid ready");
    },
    [dataSource]
  );

  const onFirstDataRendered = useCallback(() => {
    const api = gridRef.current?.api;

    if (!api) {
      return;
    }

    if (!formik.values.deliveries.length) {
      api.setServerSideSelectionState({ selectAll: false, toggledNodes: [] });
      return;
    }

    api.setServerSideSelectionState({
      selectAll: false,
      toggledNodes: formik.values.deliveries
        .map((row) => row?.delivery?._id)
        .filter(Boolean),
    });

    console.info("OrderDetailsGrid:initial selection", {
      selectedIds: formik.values.deliveries
        .map((row) => row?.delivery?._id)
        .filter(Boolean),
    });
  }, [formik.values.deliveries]);

  useEffect(() => {
    const api = gridRef.current?.api;

    dataRef.current = new Map();

    if (!api) {
      return;
    }

    api.setServerSideDatasource(dataSource);

    if (!hasAccount || !selectedCustomerId) {
      setFieldValue("deliveries", []);
      console.warn("OrderDetailsGrid:store reset due to missing account/customer", {
        hasAccount,
        selectedCustomerId,
      });
      return;
    }

    console.info("OrderDetailsGrid:refreshing store", {
      accountId: account?._id,
      customerId: selectedCustomerId,
    });

    api.refreshServerSideStore({ purge: true });
  }, [dataSource, hasAccount, selectedCustomerId, setFieldValue]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        style={{ width: "100%", height: "100%" }}
        className="ag-theme-balham"
      >
        <AgGridReact
          ref={gridRef}
          columnDefs={orderTableForCreateInvoice}
          getRowId={(params) => params.data.delivery._id}
          rowModelType={"serverSide"}
          onGridReady={onGridReady}
          rowSelection={"multiple"}
          onSelectionChanged={() => {
            const api = gridRef.current?.api;

            if (!api) {
              return;
            }

            const selectionState = api.getServerSideSelectionState();

            if (!selectionState) {
              formik.setFieldValue("deliveries", []);
              return;
            }

            const selectedRows = [];
            const seen = new Set();

            const pushRow = (row) => {
              const deliveryId = row?.delivery?._id;

              if (!deliveryId || seen.has(deliveryId)) {
                return;
              }

              seen.add(deliveryId);
              selectedRows.push(row);
            };

            const { toggledNodes = [], selectAll = false } = selectionState;

            toggledNodes.forEach((nodeState) => {
              const rowNode = nodeState?.node || nodeState?.rowNode;

              if (rowNode?.data) {
                pushRow(rowNode.data);
                return;
              }

              const nodeId =
                nodeState?.nodeId ||
                nodeState?.id ||
                (typeof nodeState === "string" ? nodeState : undefined);

              if (!nodeId) {
                return;
              }

              const existing = formik.values.deliveries.find(
                (deliveryRow) => deliveryRow?.delivery?._id === nodeId
              );

              if (existing) {
                pushRow(existing);
                return;
              }

              const cached = dataRef.current.get(nodeId);

              if (cached) {
                pushRow(cached);
              }
            });

            if (!selectedRows.length) {
              api
                .getSelectedNodes()
                .map((node) => node?.data)
                .forEach((row) => {
                  if (row) {
                    pushRow(row);
                  }
                });
            }

            if (selectAll) {
              dataRef.current.forEach((row) => pushRow(row));
            }

            console.info("OrderDetailsGrid:selection changed", {
              selectedCount: selectedRows.length,
              selectedIds: selectedRows
                .map((row) => row?.delivery?._id)
                .filter(Boolean),
            });

            formik.setFieldValue("deliveries", selectedRows);
          }}
          onFirstDataRendered={onFirstDataRendered}
        />
      </div>
    </div>
  );
};

export default OrderDetailsGrid;
