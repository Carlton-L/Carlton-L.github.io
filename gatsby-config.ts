import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Carlton.dev`,
    siteUrl: `https://www.yourdomain.tld`,
  },
  plugins: [
    // TODO: Setup Sanity.io
    // {
    //   resolve: "gatsby-source-sanity",
    //   options: {
    //     projectId: "wc7chx9j",
    //     dataset: "production",
    //   },
    // },
    "gatsby-plugin-theme-ui",
    {
      resolve: "gatsby-plugin-google-analytics",
      options: {
        trackingId: "G-RBGYMB3WPS",
      },
    },
    "gatsby-plugin-image",
    "gatsby-plugin-react-helmet",
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: "./src/images/",
        __key: "images",
      },
    },
  ],
};

export default config;
