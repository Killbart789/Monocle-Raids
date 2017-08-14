# Monocle-Raids
A standalone Raid map for [Monocle](https://github.com/Noctem/Monocle).

This was the gym/raid map we used for FFTP in Canberra.

### Notes
This map is based on the stock Monocle map, it has several issues with 900~ markers as its based on [Leaflet](https://github.com/Leaflet/Leaflet). A workaround is to create a system that uses WebGL or Canvas.

### Data Feed
You can either use [data.php#L16](data.php) to serve your data or you can edit [main.js](static/js/main.js#L156) to specify the endpoint to get data from.

In our production version we used a Redis powered cache to limit the load on the Monocle instance.

### Production Use
Make sure you serve this site over HTTPS for the location button to work.
