# Adding a learning note

The site uses GitHub Pages/Jekyll to turn Markdown notes into HTML. No browser
Markdown library or additional Jekyll plugin is needed.

1. Copy `_templates/knowledge-note.md` to `knowledge/notes/your-note-slug.md`
   (create the `notes` directory for your first note).
2. Set the title, description, actual publication date (`YYYY-MM-DD`), and a
   unique permalink. Keep `layout: knowledge-note`. The date is optional; remove
   that line if you do not want to show one. For Chinese notes, add `lang: zh-CN`.
3. Write the note below the closing `---` in Markdown. Use `##` for section
   headings because the layout already renders the title as an `h1`. Store any
   images in `assets/img/` and use root-relative paths such as
   `/assets/img/my-diagram.png`.
4. In `knowledge/index.html`, replace the forthcoming-notes message inside
   `#learning-notes` with a link and description. Use the note's permalink, for
   example:

   ```html
   <ul class="note-list">
     <li>
       <a href="/knowledge/notes/your-note-slug/">Your note title</a>
       <p>A short description of what this note explores.</p>
     </li>
   </ul>
   ```

5. Preview with `bundle exec jekyll serve` after installing the repository's
   existing Gemfile dependencies. A plain static HTTP server can preview the
   knowledge landing page, but it does not compile Markdown notes or layouts.
6. Publish through the repository's existing GitHub Pages workflow with Jekyll
   enabled. If publishing prebuilt static files, run `bundle exec jekyll build`
   and publish `_site` instead of the unprocessed Markdown sources.

The `_templates` folder is excluded by Jekyll's default underscore-directory
handling. The sample text is a writing template, not a published learning note.
