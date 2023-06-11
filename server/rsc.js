import { createServer } from "http";
import { readFile, readdir } from "fs/promises";
import sanitizeFilename from "sanitize-filename";
import ReactMarkdown from "react-markdown";
import Jimp from "jimp";

// This is a server to host data-local resources like databases and RSC.

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    await sendJSX(res, <Router url={url} />);
  } catch (err) {
    console.error(err);
    res.statusCode = err.statusCode ?? 500;
    res.end();
  }
}).listen(8081);

function Router({ url }) {
  let page;
  if (url.pathname === "/") {
    page = <BlogIndexPage />;
  } else {
    const postSlug = sanitizeFilename(url.pathname.slice(1));
    page = <BlogPostPage postSlug={postSlug} />;
  }
  return <BlogLayout>{page}</BlogLayout>;
}

async function BlogIndexPage() {
  const postFiles = await readdir("./posts");
  const postSlugs = postFiles.map((file) =>
    file.slice(0, file.lastIndexOf("."))
  );
  return (
    <section>
      <>
        <h1>Welcome to my blog</h1>
        <div>
          {postSlugs.map((slug) => (
            <Post key={slug} slug={slug} />
          ))}
        </div>
      </>
    </section>
  );
}

async function ImageComponent({ node, ...props }) {
  const readedImage = await Jimp.read(props.src);
  const imageBase64 = await readedImage.getBase64Async(Jimp.MIME_PNG);

  return (
    <div>
      <img {...props} src={imageBase64} />
      <p>
        Measures: <br /> Width: {readedImage.getWidth()} <br /> Height:{" "}
        {readedImage.getHeight()}
      </p>
    </div>
  );
}

function BlogPostPage({ postSlug }) {
  return <Post slug={postSlug} />;
}

async function Post({ slug }) {
  let content;
  try {
    content = await readFile("./posts/" + slug + ".md", "utf8");
  } catch (err) {
    throwNotFound(err);
  }
  return (
    <section>
      <h2>
        <a href={"/" + slug}>{slug}</a>
      </h2>
      <ReactMarkdown components={{ img: ImageComponent }}>
        {content}
      </ReactMarkdown>
    </section>
  );
}

function BlogLayout({ children }) {
  const author = "Jae Doe";
  const BACKGROUND_COLORS = [
    "#EAF2E3",
    "#61E8E1",
    "#F25757",
    "#F2E863",
    "#F2CD60",
  ];

  const randomColor = Math.ceil(Number(Math.random()) * 5);

  return (
    <html>
      <body
        style={{
          backgroundColor: BACKGROUND_COLORS[randomColor],
          transitionProperty: "background-color",
          transitionDuration: "1s",
          transitionTimingFunction: "linear",
        }}
      >
        <nav>
          <a href="/">Home</a>
          <hr />
          <input />
          <hr />
        </nav>
        <main>{children}</main>
        <Footer author={author} />
      </body>
    </html>
  );
}

function Footer({ author }) {
  return (
    <footer>
      <hr />
      <p>
        <i>
          (c) {author} {new Date().getFullYear()}
        </i>
      </p>
    </footer>
  );
}

async function sendJSX(res, jsx) {
  const clientJSX = await renderJSXToClientJSX(jsx);
  const clientJSXString = JSON.stringify(clientJSX, stringifyJSX);
  res.setHeader("Content-Type", "application/json");
  res.end(clientJSXString);
}

function throwNotFound(cause) {
  const notFound = new Error("Not found.", { cause });
  notFound.statusCode = 404;
  throw notFound;
}

function stringifyJSX(key, value) {
  if (value === Symbol.for("react.element")) {
    return "$RE";
  } else if (typeof value === "string" && value.startsWith("$")) {
    return "$" + value;
  } else {
    return value;
  }
}

async function renderJSXToClientJSX(jsx) {
  if (
    typeof jsx === "string" ||
    typeof jsx === "number" ||
    typeof jsx === "boolean" ||
    jsx == null
  ) {
    return jsx;
  } else if (Array.isArray(jsx)) {
    return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)));
  } else if (jsx != null && typeof jsx === "object") {
    if (jsx.$$typeof === Symbol.for("react.element")) {
      if (typeof jsx.type === "string") {
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
        };
      } else if (typeof jsx.type === "function") {
        const Component = jsx.type;
        const props = jsx.props;
        const returnedJsx = await Component(props);
        return renderJSXToClientJSX(returnedJsx);
      } else if (jsx.type === Symbol.for("react.fragment")) {
        if (
          typeof jsx.props === "object" &&
          Array.isArray(jsx.props.children)
        ) {
          return renderJSXToClientJSX(jsx.props.children);
        } else throw new Error("Not implemented");
      } else {
        throw new Error("Not implemented");
      }
    } else {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(jsx).map(async ([propName, value]) => [
            propName,
            await renderJSXToClientJSX(value),
          ])
        )
      );
    }
  } else throw new Error("Not implemented");
}
