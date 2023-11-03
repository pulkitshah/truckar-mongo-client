import axios from "../utils/axios";
import { slice } from "../slices/addresses";

const now = new Date();

class AddressApi {
  async createAddress({ values, dispatch }) {
    try {
      const response = await axios.post(`/api/address/`, values);
      let address = response.data;
      dispatch(slice.actions.createAddress({ address: response.data }));
      return {
        status: response.status,
        data: address,
        error: false,
      };
    } catch (err) {
      console.error("[Address Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Address not created, please try again or contact customer support.",
        };
      }
    }
  }

  async updateAddress({ values, dispatch }) {
    try {
      const response = await axios.patch(`/api/address/`, values);

      let address = response.data;
      console.log({ address: response.data });
      dispatch(slice.actions.updateAddress({ address: response.data }));
      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Address Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Address not updated, please try again or contact customer support.",
        };
      }
    }
  }

  async getAddressesByAccount({ dispatch, account, value }) {
    let params = { account };

    if (value) {
      params.value = value;
    }

    try {
      const response = await axios.get(
        `/api/address/${JSON.stringify({ account, value })}`
      );
      let addresses = response.data;

      dispatch(slice.actions.getAddresses(response.data));

      return {
        status: response.status,
        data: addresses,
        error: false,
      };
    } catch (err) {
      console.error("[Address Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Addresses not fetched, please try again or contact customer support.",
        };
      }
    }
  }

  // API Modified
}

export const addressApi = new AddressApi();
