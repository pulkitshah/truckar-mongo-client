import axios from "../utils/axios";

class PurchaseVoucherApi {
  async getPurchaseVouchers(params) {
    try {
      const response = await axios.get(`/api/purchase-vouchers`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Purchase Voucher Api - list]:", err);
      return {
        status: err?.response?.status || 400,
        data: [],
        error:
          err?.response?.data?.message ||
          "Failed to fetch purchase vouchers. Please try again later.",
      };
    }
  }

  async createPurchaseVoucher(payload) {
    try {
      const response = await axios.post(`/api/purchase-vouchers`, payload);

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Purchase Voucher Api - create]:", err);
      return {
        status: err?.response?.status || 400,
        data: null,
        error:
          err?.response?.data?.message ||
          "Failed to create purchase voucher. Please try again later.",
      };
    }
  }

  async updatePurchaseVoucher(id, payload) {
    try {
      const response = await axios.patch(
        `/api/purchase-vouchers/${id}`,
        payload
      );

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Purchase Voucher Api - update]:", err);
      return {
        status: err?.response?.status || 400,
        data: null,
        error:
          err?.response?.data?.message ||
          "Failed to update purchase voucher. Please try again later.",
      };
    }
  }
}

export const purchaseVoucherApi = new PurchaseVoucherApi();
