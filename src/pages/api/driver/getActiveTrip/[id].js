import dbConnect from "../../../../lib/dbConnect";
import Driver from "../../../../models/Driver";
import Order from "../../../../models/Order";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const query = {
          _id: req.query.id,
        };

        const driver = await Driver.findOne(query)
          .populate("currentOrder")
          .populate("currentOrder.customer");

        if (!driver) res.json(null);

        console.log(driver);

        const getRoute = (deliveries) => {
          let route = [];
          let waypoints = [];

          deliveries.map((delivery, index) => {
            if (index === 0) {
              route[0] = {
                title: delivery.loading.structured_formatting.main_text,
              };
            }
            if (index === deliveries.length - 1) {
              route[-1] = {
                title: delivery.unloading.structured_formatting.main_text,
              };
            }
            if (!index === 0)
              waypoints.push({
                title: delivery.loading.structured_formatting.main_text,
              });
            if (!index === deliveries.length - 1)
              waypoints.push({
                title: delivery.unloading.structured_formatting.main_text,
              });
          });

          // waypoints = waypoints.filter(
          //   (waypoint) =>
          //     waypoint !== deliveries[0].loading.structured_formatting.main_text
          // );
          // waypoints = waypoints.filter(
          //   (waypoint) =>
          //     waypoint !==
          //     deliveries[deliveries.length - 1].unloading.structured_formatting
          //       .main_text
          // );

          waypoints = [
            ...new Map(waypoints.map((item) => [item, item])).values(),
          ];

          return [route[0], ...waypoints, route[-1]];
        };

        const route = getRoute(driver.currentOrder.deliveries);

        console.log(route);

        res.json(route);
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
      }

      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}
