import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  InsertImage,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor"

export const mdxEditorPlugins = [
  listsPlugin(),
  quotePlugin(),
  headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
  linkPlugin(),
  linkDialogPlugin(),
  imagePlugin({}),
  tablePlugin(),
  thematicBreakPlugin(),
  frontmatterPlugin(),
  markdownShortcutPlugin(),
  diffSourcePlugin({
    viewMode: "rich-text",
    readOnlyDiff: true,
  }),
  toolbarPlugin({
    toolbarClassName: "",
    toolbarContents: () => mdxEditorToolbarContents,
  }),
]

export const mdxEditorToolbarContents = (
  <DiffSourceToggleWrapper>
    <UndoRedo />
    <Separator />
    <BlockTypeSelect />
    <BoldItalicUnderlineToggles />
    <Separator />
    <ListsToggle />
    <Separator />
    <InsertImage />
    <InsertThematicBreak />
    <CreateLink />
  </DiffSourceToggleWrapper>
)
