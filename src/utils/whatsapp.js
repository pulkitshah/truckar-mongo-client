import axios from "axios";
import toast from "react-hot-toast";
import { getRouteFromOrder } from "./get-route-from-order";

let url = "https://crm.noapp.io/v1/api/message/send";
let headers = {
  apiKey: "j9dmIGl0KV",
  channelKey: "cUxSdVZoQ0g=",
  "Content-Type": "application/json",
  Accept: "application/json",
};

let options = {
  method: "POST",
  url: url,
  headers: headers,
};

export const sendOrderConfirmationMessageToOwner = async (order, user) => {
  let template;

  if (order.transporter) {
    template = "owner_order_conf_trade";
  } else {
    template = "owner_order_conf_self";
  }
  switch (template) {
    case "owner_order_conf_self":
      options.data = {
        to: user.mobile.replace("+", ""),
        type: "template",
        template: {
          name: template,
          component: [
            {
              type: "body",
              parameter: [
                order.orderNo,
                `${order.customer.name} (${order.customer.mobile})`,
                getRouteFromOrder(order.deliveries),
                order.saleType.value === "quantity"
                  ? `Rs ${order.saleRate} / ${order.saleType.unit}`
                  : `Rs ${order.saleRate} (Fixed)`,
                order.vehicleNumber,
                order.driver
                  ? `${order.driver.name
                      .toLowerCase()
                      .split(" ")
                      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                      .join(" ")} ${
                      order.driver.mobile
                        ? "(" + order.driver.mobile + ")"
                        : "(Mobile Not Updated)"
                    }`
                  : "(Driver Not Updated)",
                "LR",
              ],
            },
          ],
        },
      };
      break;

    case "owner_order_conf_trade":
      options.data = {
        to: user.mobile.replace("+", ""),
        type: "template",
        template: {
          name: template,
          component: [
            {
              type: "body",
              parameter: [
                order.orderNo,
                `${order.customer.name} (${order.customer.mobile})`,
                getRouteFromOrder(order.deliveries),
                order.saleType.value === "quantity"
                  ? `Rs ${order.saleRate} / ${order.saleType.unit}`
                  : `Rs ${order.saleRate} (Fixed)`,
                `${order.transporter.name} (${order.transporter.mobile})`,
                order.purchaseType === "quantity"
                  ? `Rs ${order.purchaseRate} / ${order.saleType.unit}`
                  : `Rs ${order.purchaseRate} (Fixed)`,
                order.vehicleNumber,
                order.driver
                  ? `${
                      order.driverMobile
                        ? order.driverMobile
                        : "(Mobile Not Updated)"
                    }`
                  : "(Driver Not Updated)",
                "LR",
              ],
            },
          ],
        },
      };
      break;

    default:
      break;
  }
  try {
    const { data } = await axios.request(options);
    toast.success("Whatsaap message sent successfully.");
  } catch (error) {
    console.error(error);
  }
};

export const sendOrderConfirmationMessageToTransporter = async ({
  order,
  user,
  account,
}) => {
  let template;

  if (order.transporter) {
    template = "transporter_order_conf";
  }

  switch (template) {
    case "transporter_order_conf":
      options.data = {
        to: order.transporter.mobile.replace("+", ""),
        type: "template",
        template: {
          name: template,
          component: [
            {
              type: "body",
              parameter: [
                account.name,
                order.vehicleNumber,
                getRouteFromOrder(order.deliveries),
                order.driverName
                  ? `${order.driverName
                      .toLowerCase()
                      .split(" ")
                      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                      .join(" ")} ${
                      order.driverMobile
                        ? "(" + order.driveMobile + ")"
                        : "(Mobile Not Updated)"
                    }`
                  : "(Driver Not Updated)",
                order.purchaseType === "quantity"
                  ? `Rs ${order.purchaseRate} / ${order.saleType.unit}`
                  : `Rs ${order.purchaseRate} (Fixed)`,
                order.minimumPurchaseGuarantee
                  ? `${order.minimumPurchaseGuarantee} ${order.saleType.unit}`
                  : `N/A`,

                `For any enquiry, please contact ${user.name} (${user.mobile})`,
              ],
            },
          ],
        },
      };
      break;

    default:
      break;
  }
  try {
    console.log(options);
    const { data } = await axios.request(options);
    toast.success("Whatsaap message sent successfully.");
  } catch (error) {
    console.error(error);
  }
};

export const sendOrderConfirmationMessageToDriver = async ({ order }) => {
  let template;

  switch (template) {
    case "driver_activate_trip":
      options.data = {
        to: order.driver.mobile.replace("+", ""),
        type: "template",
        template: {
          name: template,
          component: [
            {
              type: "body",
              parameter: [
                account.name,
                order.vehicleNumber,
                getRouteFromOrder(order.deliveries),
                `For any enquiry, please contact ${user.name} (${user.mobile})`,
              ],
            },
          ],
        },
      };
      break;

    default:
      break;
  }
  try {
    console.log(options);
    const { data } = await axios.request(options);
    toast.success("Whatsaap message sent successfully.");
  } catch (error) {
    console.error(error);
  }
};
