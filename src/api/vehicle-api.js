import axios from "../utils/axios";

import { slice } from "../slices/vehicles";

const now = new Date();

class VehicleApi {
  async validateDuplicateVehicleNumber(account, vehicleNumber) {
    try {
      const response = await axios.get(
        `/api/vehicle/validateDuplicateVehicleNumber/${JSON.stringify({
          account,
          vehicleNumber,
        })}`
      );
      let vehicle = response.data;

      return {
        status: response.status,
        data: Boolean(!vehicle),
        error: false,
      };
    } catch (err) {
      console.error("[Vehicle Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Something went wrong. Please try again or contact customer support.",
        };
      }
    }
    return Boolean(!vehicle);
  }

  async createVehicle(newVehicle, dispatch) {
    try {
      const response = await axios.post(`/api/vehicle/`, newVehicle);
      let vehicle = response.data;
      console.log(vehicle);

      return {
        status: response.status,
        data: vehicle,
        error: false,
      };
    } catch (err) {
      console.error("[Vehicle Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Vehicle not created, please try again or contact customer support.",
        };
      }
    }
  }

  async updateVehicle(dispatch, editedVehicle) {
    try {
      const response = await axios.patch(`/api/vehicle/`, editedVehicle);

      dispatch(slice.actions.updateVehicle({ vehicle: response.data }));
      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Vehicle Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Vehicle not updated, please try again or contact customer support.",
        };
      }
    }
  }

  async getVehiclesByAccount(dispatch, account, value) {
    try {
      const response = await axios.get(
        `/api/vehicle/${JSON.stringify({ account, value })}`
      );
      let vehicles = response.data;
      dispatch(slice.actions.getVehicles(vehicles));
      return {
        status: response.status,
        data: vehicles,
        error: false,
      };
    } catch (err) {
      console.error("[Vehicle Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Vehicles not fetched, please try again or contact customer support.",
        };
      }
    }
  }
}

export const vehicleApi = new VehicleApi();
