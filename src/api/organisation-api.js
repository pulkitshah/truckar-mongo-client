import axios from "../utils/axios";
import { slice } from "../slices/organisations";

const now = new Date();

class OrganisationApi {
  async createOrganisation(newOrganisation, dispatch) {
    try {
      const response = await axios.post(`/api/organisation/`, newOrganisation);
      let organisation = response.data;
      console.log(organisation);
      dispatch(slice.actions.createOrganisation({ organisation }));
      return {
        status: response.status,
        data: organisation,
        error: false,
      };
    } catch (err) {
      console.error("[Organisation Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Organisation not created, please try again or contact customer support.",
        };
      }
    }
  }

  async getOrganisationsByAccount(dispatch, account, value) {
    try {
      const response = await axios.get(
        `/api/organisation/${JSON.stringify({ account, value })}`
      );
      let organisations = response.data;
      dispatch && dispatch(slice.actions.getOrganisations(organisations));
      return {
        status: response.status,
        data: organisations,
        error: false,
      };
    } catch (err) {
      console.error("[Organisation Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Organisations not fetched, please try again or contact customer support.",
        };
      }
    }
  }

  async updateOrganisation(editedOrganisation, dispatch) {
    try {
      const response = await axios.patch(
        `/api/organisation/`,
        editedOrganisation
      );

      dispatch(
        slice.actions.updateOrganisation({ organisation: response.data })
      );
      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Organisation Api]: ", err);
      if (err) {
        return {
          status: 400,
          data: err,
          error:
            "Organisation not updated, please try again or contact customer support.",
        };
      }
    }
  }
}

export const organisationApi = new OrganisationApi();
