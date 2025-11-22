# Angular Clientside Lock

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.0 with AI Instructions

## Running the Application

To run the application in development mode, use the following command:

```
npm run develop
```

Open your browser and navigate to `http://localhost:4204` to access the application.

## Cloning Guide

1.  Clone only the remote primary HEAD (default: origin/main)

```bash
git clone <url> --single-branch
```

2. Only specific branch

```bash
git clone <url> --branch <branch> --single-branch [<folder>]
```

```bash
git clone <url> --branch <branch>
```

3. Cloning repositories using degit

   - main branch is default.

```bash
npx degit github:user/repo#branch-name <folder-name>
```

4. Cloning this project with skeleton

```bash
git clone https://github.com/actionanand/office-pulse.git --branch 1-skeleton angular-proj-name
```

```bash
npx degit github:actionanand/office-pulse#1-skeleton angular-proj-name
```

## Automate using `Prettier`, `Es Lint` and `Husky`

1. Install the compatible node version

```bash
  nvm install v24.11.1
```

2. Install and Configure Prettier

   - Install prettier as below:

   ```bash
     npm run add prettier -D
   ```

   - Create a `.prettierrc.yml` file and write down the format as below: - [online ref](https://prettier.io/docs/en/options.html)

   ```yml
   trailingComma: 'all'
   tabWidth: 2
   useTabs: false
   semi: true
   singleQuote: true
   bracketSpacing: true
   bracketSameLine: true
   arrowParens: 'avoid'
   printWidth: 120
   overrides:
     - files:
         - '*.js'
         - '*.jsx'
       options:
         bracketSpacing: true
         jsxSingleQuote: true
         semi: true
         singleQuote: true
         tabWidth: 2
         useTabs: false
     - files:
         - '*.ts'
       options:
         tabWidth: 2
   ```

   - Create a `.prettierignore` file and write as below(sample)

   ```gitignore
   # Ignore artifacts:
   build
   coverage
   e2e
   node_modules
   dist
   dest
   reports

   # Ignore files
   *.lock
   package-lock.json
   yarn.lock
   ```

3. Install `Es Lint`, if not installed

```bash
ng add @angular-eslint/schematics
```

if error comes, use the below command

```shell
ng add @angular-eslint/schematics@20.0.0-alpha.1
# or
ng add @angular-eslint/schematics@next
```

4. Configure pre-commit hooks

Pre-commit hooks are a nice way to run certain checks to ensure clean code. This can be used to format staged files if for some reason they weren’t automatically formatted during editing. [husky](https://github.com/typicode/husky) can be used to easily configure git hooks to prevent bad commits. We will use this along with [pretty-quick](https://github.com/azz/pretty-quick) to run Prettier on our changed files. Install these packages, along with [npm-run-all](https://github.com/mysticatea/npm-run-all), which will make it easier for us to run npm scripts:

```bash
npm install -D husky pretty-quick npm-run-all
```

To configure the pre-commit hook, simply add a `precommit` npm script. We want to first run Prettier, then run TSLint on the formatted files. To make our scripts cleaner, I am using the npm-run-all package, which gives you two commands, `run-s` to run scripts in sequence, and `run-p` to run scripts in parallel:

```json
  "precommit": "run-s format:fix lint",
  "format:fix": "pretty-quick --staged",
  "format:check": "prettier --config ./.prettierrc --list-different \"src/{app,environments,assets}/**/*{.ts,.js,.json,.css,.scss}\"",
  "format:all": "prettier --config ./.prettierrc --write \"src/{app,environments,assets}/**/*{.ts,.js,.json,.css,.scss}\"",
  "lint": "ng lint",
```

5. Initialize husky

   - Run it once

   ```bash
     npx husky init
   ```

   - Add a hook

   ```bash
     echo "npm run precommit" > .husky/pre-commit
     echo "npm run test" > .husky/pre-commit
   ```

   - Make a commit

   ```bash
     git commit -m "Keep calm and commit"
     # `npm run precommit and npm test` will run every time you commit
   ```

6. How to skip prettier format only in particular file

   1. JS

   ```js
   matrix(1, 0, 0, 0, 1, 0, 0, 0, 1);

   // prettier-ignore
   matrix(
       1, 0, 0,
       0, 1, 0,
       0, 0, 1
     )
   ```

   2. JSX

   ```jsx
   <div>
     {/* prettier-ignore */}
     <span     ugly  format=''   />
   </div>
   ```

   3. HTML

   ```html
   <!-- prettier-ignore -->
   <div         class="x"       >hello world</div            >

   <!-- prettier-ignore-attribute -->
   <div (mousedown)="       onStart    (    )         " (mouseup)="         onEnd      (    )         "></div>

   <!-- prettier-ignore-attribute (mouseup) -->
   <div (mousedown)="onStart()" (mouseup)="         onEnd      (    )         "></div>
   ```

   4. CSS

   ```css
   /* prettier-ignore */
   .my    ugly rule
     {
   
     }
   ```

   5. Markdown

   ```md
     <!-- prettier-ignore -->

   Do not format this
   ```

   6. YAML

   ```yml
   # prettier-ignore
   key  : value
     hello: world
   ```

   7. For more, please [check](https://prettier.io/docs/en/ignore.html)

## Resources

- [GitHub Actions for Angular](https://github.com/rodrigokamada/angular-github-actions)
- [Angular 20 – What’s New](https://angular.love/angular-20-whats-new)
- [Announcing Angular v20 - Official](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301)
- [Angular 20—Let the Magic Flow](https://www.telerik.com/blogs/angular-20-let-magic-flow)
- [What's new in Angular 20.0?](https://blog.ninja-squad.com/2025/05/28/what-is-new-angular-20.0/)
- [Angular 20 is Here: Ultimate Guide—Everything You Need to Know About New Features and Performance](https://www.avidclan.com/blog/angular-20-is-here-ultimate-guide-everything-you-need-to-know-about-new-features-and-performance)
- [Angular Roadmap - Official](https://angular.dev/roadmap)
- [The `package.json` guide](https://flaviocopes.com/package-json/#author)
- [What's new in Angular 20.3?](https://blog.ninja-squad.com/2025/09/11/what-is-new-angular-20.3)
- [Ng-News 25/37: Angular 20.3, SignalForms AMA, RFC: Angular & AI](https://medium.com/ng-news/ng-news-25-37-angular-20-3-signalforms-ama-rfc-angular-ai-a0f9afaadf6e)
