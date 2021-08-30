## Releases

--
#### 2.1.0 - 2021-08-30

-   feat: Add support for EU Data Center

#### 2.0.8 - 2021-05-26

-   Generate bundle that was not included in 2.0.7 release 

#### 2.0.7 - 2021-05-26

-   fix: Map impression and promotion events to align with server

#### 2.0.6 - 2021-04-06

-   feat: Add includeEmailAsUserProperty and no longer set userIdentities as user properties to align with server

    -   Previously the web kit set non-customerid user identities as user properties. This was not consistent with the server, and so this functionality has been removed from web SDK v2.

-   build: Update eslint/prettier config, fix linting errors

#### 2.0.5 - 2021-01-11

-   Update Amplitude SDK to 7.2.1
-   Bugfix - Check window for node environments
-   Remove build file from root directory

#### 2.0.4 - 2020-11-04

-   Bugfix - remove isTesting variable

#### 2.0.3 - 2020-06-30

-   Feat: Support sending objects as custom attributes to Amplitude

#### 2.0.2 - 2020-06-03

-   Update Amplitude SDK version to 6.2.0
-   Update test configuration

#### 2.0.1 - 2020-02-03

-   Modify rollup settings - build dist files
